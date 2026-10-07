import { test } from "node:test";
import assert from "node:assert/strict";
import {
  duration,
  seconds,
  coverageSegments,
  validateClip,
  readableFields,
} from "../src/lib/format.js";
test("durations preserve hours and handle invalid inputs", () => {
  assert.equal(duration(3661), "1:01:01");
  assert.equal(duration(-1), "0:00");
  assert.equal(seconds("02:33"), 153);
  assert.ok(Number.isNaN(seconds("bad")));
});
test("coverage clips discontinuous recordings to the view window", () => {
  assert.deepEqual(
    coverageSegments(
      [
        {
          start_time: new Date(0).toISOString(),
          end_time: new Date(30).toISOString(),
        },
        {
          start_time: new Date(70).toISOString(),
          end_time: new Date(110).toISOString(),
        },
      ],
      10,
      90,
    ),
    [
      { left: 0, width: 25 },
      { left: 75, width: 25 },
    ],
  );
  assert.deepEqual(coverageSegments([], 10, 10), []);
});
test("clip creation validates duration and full source identity", () => {
  const source = {
    source_type: "upload",
    filepath: "storage/uploads/2/test.mp4",
    duration: 90,
  };
  assert.equal(
    validateClip(source, { start_offset: 10, end_offset: 30 }).filepath,
    source.filepath,
  );
  assert.throws(() =>
    validateClip(source, { start_offset: 30, end_offset: 10 }),
  );
  assert.throws(() =>
    validateClip(source, { start_offset: 0, end_offset: 100 }),
  );
  assert.throws(() => validateClip(null, {}));
  assert.throws(() =>
    validateClip(
      { ...source, duration: 9000 },
      { start_offset: 0, end_offset: 8000 },
    ),
  );
});
test("monitor clips use local date times and validate the window", () => {
  const source = { source_type: "monitor", monitor_id: 5 };
  const result = validateClip(source, {
    start_time: "2026-10-07T12:00:00",
    end_time: "2026-10-07T12:02:00",
  });
  assert.equal(result.monitor_id, 5);
  assert.equal(result.end_offset - result.start_offset, 120);
});
test("batched tool parameters become readable individual fields, not JSON", () => {
  const fields = readableFields({
    frames: [
      { video_id: 1, time: "00:02" },
      { video_id: 2, time: "00:04" },
    ],
    query: "黑色包",
  });
  assert.equal(fields.length, 5);
  assert.equal(fields[0].label, "核验画面 1 · 视频编号");
  assert.equal(fields.at(-1).label, "检索内容");
});
