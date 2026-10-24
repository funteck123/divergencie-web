import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { compressImage, parseImage, MAX_SIDE, ticketImagePath } from "./ticketImage.js";

const dataUrl = (type, buf) => `data:image/${type};base64,${buf.toString("base64")}`;
const png = (w, h, channels = 3) => sharp({ create: { width: w, height: h, channels, background: { r: 30, g: 90, b: 200 } } }).png().toBuffer();

test("the stored file name is fixed per ticket", () => assert.equal(ticketImagePath("TKT-0371"), "tickets/TKT-0371.jpg"));

test("a real PNG and a real JPEG data URL are accepted", async () => {
  const p = await png(40, 30);
  assert.ok(parseImage(dataUrl("png", p)));
  const j = await sharp(p).jpeg().toBuffer();
  assert.ok(parseImage(dataUrl("jpeg", j)));
});

test("not a picture data URL, wrong type, or bytes that do not match the type are refused", async () => {
  const p = await png(10, 10);
  assert.equal(parseImage(""), null);
  assert.equal(parseImage("hello"), null);
  assert.equal(parseImage("data:text/html;base64,PGI+"), null);
  assert.equal(parseImage("data:image/svg+xml;base64,PHN2Zz4="), null);
  assert.equal(parseImage(dataUrl("jpeg", p)), null, "PNG bytes labelled as JPEG");
  assert.equal(parseImage(dataUrl("png", Buffer.from("not an image"))), null);
});

test("a picture over 6 MB is refused", () => {
  const big = Buffer.alloc(6 * 1024 * 1024 + 1, 0xff);
  big[0] = 0xff; big[1] = 0xd8;
  assert.equal(parseImage(dataUrl("jpeg", big)), null);
});

test("a large screenshot is scaled to at most 1280 px on its long side and saved as a small JPEG", async () => {
  const big = await png(3000, 1800);
  const out = await compressImage(big);
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(Math.max(meta.width, meta.height), MAX_SIDE);
  assert.ok(Math.abs(meta.width / meta.height - 3000 / 1800) < 0.01, "keeps the shape");
  assert.ok(out.length < big.length, "smaller than the PNG it came from");
});

test("a small picture is never scaled up", async () => {
  const out = await compressImage(await png(200, 100));
  const meta = await sharp(out).metadata();
  assert.deepEqual([meta.width, meta.height], [200, 100]);
});

test("transparency becomes white, not black", async () => {
  const transparent = await sharp({ create: { width: 20, height: 20, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
  const { data } = await sharp(await compressImage(transparent)).raw().toBuffer({ resolveWithObject: true });
  assert.ok(data[0] > 240 && data[1] > 240 && data[2] > 240);
});

test("bytes that are not an image throw instead of being stored", async () => {
  await assert.rejects(() => compressImage(Buffer.from("this is not a picture at all")));
});
