# Scan API 与前端「识别位置并显示」对接说明

## 后端已实现

- **POST /files/:id/scan**：对指定文件跑 LLM 扫描，写 DB + 存结果 txt，并返回本次扫描的指令列表（供前端高亮和 sidebar）。
- **GET /files/:id/scans**：列出该文件的所有 scan（camelCase）。
- **GET /scans/:id/download**：下载某次 scan 的结果 .txt 文件。

## 前端如何「识别位置并显示」

1. **触发扫描**：用户点 Scan 后，前端请求 `POST /files/:id/scan`（需 JWT）。
2. **响应体**（200）示例：
   ```json
   {
     "scanId": "uuid",
     "instructions": [
       {
         "lineNumber": 12,
         "commentText": "# step 1: generate a button",
         "isInstruction": true,
         "type": "Generate",
         "confidence": 0.91
       }
     ],
     "instructionCount": 1,
     "scannedAt": "2026-03-12T..."
   }
   ```
   - `instructions` 已按后端过滤：仅包含 **confidence ≥ 0.6** 的项，可直接用于高亮和展示。
3. **建行号 → 指令映射**：前端用 `instructions` 建 `instructionByLine[lineNumber] = { type, commentText, ... }`。
4. **高亮与 hover**：
   - 用 CodeMirror 的 line decorations 对 `instructionByLine` 里的每个 `lineNumber` 加高亮。
   - 用 `editor.state.doc.line(lineNumber)` 取该行内容/范围；用 `instructionByLine[lineNumber].type` 决定 hover 按钮图标（Run/Modify/Delete/Generate/Other）。
5. **Sidebar**：直接遍历 `instructions`，按 `lineNumber`、`commentText` 列出来；点击时滚动到对应行。

## 小结

- **「这行是不是 instruction」**：看该行号是否在本次 scan 返回的 `instructions` 里（或查 `instructionByLine[lineNumber]`）。
- **「当前行内容/位置」**：用 CodeMirror 的 `state.doc.line(lineNumber)` 或 `state.doc.lineAt(cursorPos)`。
- 每次重新 Scan 后，用新返回的 `instructions` 覆盖之前的 `instructionByLine` 并重算高亮即可。
