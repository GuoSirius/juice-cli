---
name: auto-commit
description: 每次完成代码改动后自动 git commit，用户自行发布
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ed9b8d1e-69ad-4572-b62b-cbd4e24bbef5
---

每次完成阶段性代码改动后，自动 `git add` + `git commit`，不需要询问用户是否提交。

**Why:** 用户自己负责 `git push` 和 `npm publish`，提交环节不需要反复确认。

**How to apply:** 完成一个功能或修复后，直接 stage 相关文件并提交，使用 Conventional Commits 格式。提交完告诉用户当前有几个未推送的 commit 即可。
