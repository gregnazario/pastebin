# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:esbuild] Transform failed with 1 error: /Users/greg/git/pastebin/src/mocks/argon2-browser.ts:55:9: ERROR: Multiple exports with the same name \"ArgonType\""
  - generic [ref=e5]: /Users/greg/git/pastebin/src/mocks/argon2-browser.ts:55:9
  - generic [ref=e6]: "Multiple exports with the same name \"ArgonType\" 53 | 54 | export default argon2; 55 | export { ArgonType }; | ^"
  - generic [ref=e7]: at failureErrorWithLog (/Users/greg/git/pastebin/node_modules/esbuild/lib/main.js:1467:15) at /Users/greg/git/pastebin/node_modules/esbuild/lib/main.js:736:50 at responseCallbacks.<computed> (/Users/greg/git/pastebin/node_modules/esbuild/lib/main.js:603:9) at handleIncomingPacket (/Users/greg/git/pastebin/node_modules/esbuild/lib/main.js:658:12) at Socket.readFromStdout (/Users/greg/git/pastebin/node_modules/esbuild/lib/main.js:581:7) at Socket.emit (node:events:518:28) at addChunk (node:internal/streams/readable:561:12) at readableAddChunkPushByteMode (node:internal/streams/readable:512:3) at Readable.push (node:internal/streams/readable:392:5) at Pipe.onStreamRead (node:internal/stream_base_commons:189:23)
  - generic [ref=e8]:
    - text: Click outside, press Esc key, or fix the code to dismiss.
    - text: You can also disable this overlay by setting
    - code [ref=e9]: server.hmr.overlay
    - text: to
    - code [ref=e10]: "false"
    - text: in
    - code [ref=e11]: vite.config.ts
    - text: .
```