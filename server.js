import { createServer } from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(root, "public");
const dataDir = join(root, "data");
const dataFile = join(dataDir, "checklist.json");
const port = Number(process.env.PORT || 3000);
const clients = new Set();

const seedData = {
  categories: [
    {
      id: "cat-docs",
      title: "เอกสาร / เงิน / ติดต่อ",
      items: [
        { id: "item-id-card", text: "บัตรประชาชน" },
        { id: "item-cash", text: "เงินสดย่อย" },
        { id: "item-phone", text: "โทรศัพท์" },
        { id: "item-cable", text: "สายชาร์จ" },
        { id: "item-power-bank", text: "พาวเวอร์แบงค์" },
        { id: "item-family-notice", text: "แจ้งคนที่บ้านเรื่องวันไป-กลับ" }
      ]
    },
    {
      id: "cat-water-light",
      title: "กันน้ำ / ไฟ / อุปกรณ์จำเป็น",
      items: [
        { id: "item-dry-bag", text: "ถุงกันน้ำ" },
        { id: "item-phone-waterproof", text: "ซองกันน้ำมือถือ" },
        { id: "item-headlamp", text: "ไฟฉายคาดหัว" },
        { id: "item-backup-light", text: "ไฟฉายสำรอง" },
        { id: "item-battery", text: "ถ่านสำรอง" },
        { id: "item-trash-bag", text: "ถุงขยะส่วนตัว" },
        { id: "item-rain-cover", text: "เสื้อกันฝน" },
        { id: "item-emergency-kit", text: "ชุดฉุกเฉิน" }
      ]
    },
    {
      id: "cat-medicine",
      title: "ยา / สุขภาพ",
      items: [
        { id: "item-personal-med", text: "ยาประจำตัว" },
        { id: "item-motion-sick", text: "ยาแก้เมารถ" },
        { id: "item-paracetamol", text: "พารา" },
        { id: "item-allergy", text: "ยาแก้แพ้" },
        { id: "item-ors", text: "เกลือแร่" },
        { id: "item-plaster", text: "พลาสเตอร์" },
        { id: "item-wound-care", text: "ยาทาแผล / เบตาดีน" },
        { id: "item-mosquito", text: "สเปรย์กันยุง / ยาทากันแมลง" }
      ]
    },
    {
      id: "cat-clothes",
      title: "เสื้อผ้า",
      items: [
        { id: "item-hiking-shirt", text: "เสื้อเดินป่า" },
        { id: "item-hiking-pants", text: "กางเกงเดินป่า" },
        { id: "item-poncho", text: "เสื้อกันฝน / poncho" },
        { id: "item-light-jacket", text: "เสื้อกันหนาวบาง" },
        { id: "item-sleepwear", text: "ชุดนอน" },
        { id: "item-leech-socks", text: "ถุงกันทาก" },
        { id: "item-socks", text: "ถุงเท้า" },
        { id: "item-towel-cloth", text: "ผ้าขนหนูแห้งไว" }
      ]
    },
    {
      id: "cat-shoes",
      title: "รองเท้า",
      items: [
        { id: "item-hiking-shoes", text: "รองเท้าเดินป่า" },
        { id: "item-sandals", text: "รองเท้าแตะรัดส้น" },
        { id: "item-wet-shoes", text: "ชุดใส่รองเท้าเปียก" }
      ]
    },
    {
      id: "cat-sleep",
      title: "นอน / แคมป์",
      items: [
        { id: "item-tent-borrow", text: "เต็นท์ หรือยืมของบ้านรถได้" },
        { id: "item-sleeping-bag-borrow", text: "ถุงนอน หรือยืมของบ้านรถได้" },
        { id: "item-sleeping-pad", text: "แผ่นรองนอน" },
        { id: "item-pillow", text: "หมอนเล็ก / หมอนเป่าลม" }
      ]
    },
    {
      id: "cat-food-drink",
      title: "กิน / ดื่ม",
      items: [
        { id: "item-water-bottle", text: "ขวดน้ำ" },
        { id: "item-private-cup", text: "แก้วส่วนตัว" },
        { id: "item-snack-energy", text: "ลูกอม / ถั่ว / energy bar" },
        { id: "item-coffee-tea", text: "กาแฟ / ชา ถ้าต้องการ" }
      ]
    },
    {
      id: "cat-before-trip",
      title: "ก่อนเดินทาง",
      items: [
        { id: "item-map-offline", text: "เช็กพื้นที่ปิด" },
        { id: "item-weather", text: "เช็กสภาพอากาศ" },
        { id: "item-food-plan", text: "คุยกันจัดเตรียมเรื่องอาหาร" },
        { id: "item-backpack-plan", text: "คุยกันจัดกระเป๋าเรื่องลูกหาบ" },
        { id: "item-meeting-point", text: "แชทบอกจุดนัดหมาย" },
        { id: "item-money-transfer", text: "ชำระเงิน/ทอนคุยเรื่องเงิน" }
      ]
    }
  ],
  people: [],
  checks: {},
  updatedAt: new Date().toISOString()
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

async function ensureData() {
  await mkdir(dataDir, { recursive: true });
  try {
    await stat(dataFile);
  } catch {
    await writeFile(dataFile, JSON.stringify(seedData, null, 2));
  }
}

async function readData() {
  await ensureData();
  return JSON.parse(await readFile(dataFile, "utf8"));
}

async function saveData(data) {
  data.updatedAt = new Date().toISOString();
  await writeFile(dataFile, JSON.stringify(data, null, 2));
  broadcast(data);
  return data;
}

function broadcast(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(body);
}

async function parseJson(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  if (!body) return {};
  return JSON.parse(body);
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanText(value, max = 80) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

async function handleApi(req, res) {
  try {
    if (req.method === "GET" && req.url === "/api/state") {
      return sendJson(res, 200, await readData());
    }

    if (req.method === "GET" && req.url === "/api/events") {
      res.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store",
        connection: "keep-alive"
      });
      res.write(`data: ${JSON.stringify(await readData())}\n\n`);
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }

    if (req.method === "POST" && req.url === "/api/people") {
      const input = await parseJson(req);
      const name = cleanText(input.name, 40);
      if (!name) return sendJson(res, 400, { error: "กรุณาใส่ชื่อ" });

      const data = await readData();
      const existing = data.people.find((person) => person.name.toLowerCase() === name.toLowerCase());
      if (existing) return sendJson(res, 200, await saveData(data));

      data.people.push({ id: makeId("person"), name });
      return sendJson(res, 201, await saveData(data));
    }

    if (req.method === "POST" && req.url === "/api/categories") {
      const input = await parseJson(req);
      const title = cleanText(input.title, 60);
      if (!title) return sendJson(res, 400, { error: "กรุณาใส่ชื่อหมวด" });

      const data = await readData();
      data.categories.push({ id: makeId("cat"), title, items: [] });
      return sendJson(res, 201, await saveData(data));
    }

    if (req.method === "POST" && req.url === "/api/items") {
      const input = await parseJson(req);
      const categoryId = cleanText(input.categoryId, 80);
      const text = cleanText(input.text, 90);
      if (!categoryId || !text) return sendJson(res, 400, { error: "ข้อมูลรายการไม่ครบ" });

      const data = await readData();
      const category = data.categories.find((entry) => entry.id === categoryId);
      if (!category) return sendJson(res, 404, { error: "ไม่พบหมวดนี้" });

      category.items.push({ id: makeId("item"), text });
      return sendJson(res, 201, await saveData(data));
    }

    if (req.method === "DELETE" && req.url?.startsWith("/api/people/")) {
      const personId = cleanText(decodeURIComponent(req.url.split("/").pop() || ""), 80);
      const data = await readData();
      const before = data.people.length;
      data.people = data.people.filter((person) => person.id !== personId);
      delete data.checks[personId];
      if (data.people.length === before) return sendJson(res, 404, { error: "ไม่พบชื่อนี้" });
      return sendJson(res, 200, await saveData(data));
    }

    if (req.method === "DELETE" && req.url?.startsWith("/api/categories/")) {
      const categoryId = cleanText(decodeURIComponent(req.url.split("/").pop() || ""), 80);
      const data = await readData();
      const category = data.categories.find((entry) => entry.id === categoryId);
      if (!category) return sendJson(res, 404, { error: "ไม่พบหมวดนี้" });

      const itemIds = new Set(category.items.map((item) => item.id));
      data.categories = data.categories.filter((entry) => entry.id !== categoryId);
      for (const personChecks of Object.values(data.checks)) {
        for (const itemId of itemIds) delete personChecks[itemId];
      }
      return sendJson(res, 200, await saveData(data));
    }

    if (req.method === "DELETE" && req.url?.startsWith("/api/items/")) {
      const itemId = cleanText(decodeURIComponent(req.url.split("/").pop() || ""), 80);
      const data = await readData();
      let removed = false;
      for (const category of data.categories) {
        const before = category.items.length;
        category.items = category.items.filter((item) => item.id !== itemId);
        removed ||= category.items.length !== before;
      }
      if (!removed) return sendJson(res, 404, { error: "ไม่พบรายการนี้" });

      for (const personChecks of Object.values(data.checks)) {
        delete personChecks[itemId];
      }
      return sendJson(res, 200, await saveData(data));
    }

    if (req.method === "PATCH" && req.url === "/api/checks") {
      const input = await parseJson(req);
      const personId = cleanText(input.personId, 80);
      const itemId = cleanText(input.itemId, 80);
      const checked = Boolean(input.checked);
      if (!personId || !itemId) return sendJson(res, 400, { error: "ข้อมูลเช็กลิสต์ไม่ครบ" });

      const data = await readData();
      if (!data.people.some((person) => person.id === personId)) return sendJson(res, 404, { error: "ไม่พบชื่อนี้" });
      const hasItem = data.categories.some((category) => category.items.some((item) => item.id === itemId));
      if (!hasItem) return sendJson(res, 404, { error: "ไม่พบรายการนี้" });

      data.checks[personId] ||= {};
      data.checks[personId][itemId] = checked;
      return sendJson(res, 200, await saveData(data));
    }

    return sendJson(res, 404, { error: "ไม่พบ API นี้" });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || "เกิดข้อผิดพลาด" });
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safePath);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    await stat(filePath);
    res.writeHead(200, {
      "content-type": mimeTypes[extname(filePath)] || "application/octet-stream"
    });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

await ensureData();

createServer((req, res) => {
  if (req.url?.startsWith("/api/")) {
    handleApi(req, res);
    return;
  }
  serveStatic(req, res);
}).listen(port, "0.0.0.0", () => {
  console.log(`Checklist app is running at http://localhost:${port}`);
});
