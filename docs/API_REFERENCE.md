# BioLab ELN API 接口文档

## 基础信息

- 基础URL: `http://localhost:3000/api`
- 认证方式: JWT Token (Cookie 或 Authorization Header)
- 内容类型: `application/json`

---

## 认证接口

### 登录

```
POST /api/auth/login
```

**请求体**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应**
```json
{
  "user": {
    "id": "clxxx",
    "email": "user@example.com",
    "name": "用户名",
    "role": "RESEARCHER"
  },
  "token": "jwt-token-string"
}
```

### 登出

```
POST /api/auth/logout
```

**响应**
```json
{
  "success": true
}
```

### 获取当前用户

```
GET /api/auth/me
```

**响应**
```json
{
  "user": {
    "id": "clxxx",
    "email": "user@example.com",
    "name": "用户名",
    "role": "RESEARCHER"
  }
}
```

---

## 实验记录接口

### 获取实验列表

```
GET /api/experiments
```

**查询参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| viewMode | string | `default`(默认) 或 `global`(全局视角) |
| projectId | string | 按项目筛选 |
| status | string | 按状态筛选 |
| search | string | 搜索关键词 |

**响应**
```json
[
  {
    "id": "clxxx",
    "title": "实验标题",
    "summary": "实验摘要",
    "reviewStatus": "DRAFT",
    "authorId": "user-id",
    "author": { "id": "...", "name": "作者名" },
    "projects": [...],
    "attachments": [...],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### 创建实验

```
POST /api/experiments
```

**请求体**
```json
{
  "title": "实验标题",
  "summary": "实验摘要",
  "conclusion": "实验结论",
  "projectIds": ["project-id-1"],
  "tags": "标签1,标签2"
}
```

### 获取实验详情

```
GET /api/experiments/[id]
```

### 更新实验

```
PUT /api/experiments/[id]
```

**请求体**
```json
{
  "title": "更新后的标题",
  "summary": "更新后的摘要",
  "conclusion": "更新后的结论"
}
```

### 删除实验

```
DELETE /api/experiments/[id]
```

### 提交审核

```
POST /api/experiments/[id]/submit
```

**请求体**
```json
{
  "reviewerIds": ["reviewer-id-1", "reviewer-id-2"],
  "submitNote": "提交说明（可选）"
}
```

**查询参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| viewMode | string | `default` 或 `global` |

### 审核实验

```
POST /api/experiments/[id]/review
```

**请求体**
```json
{
  "action": "APPROVE",  // APPROVE | REQUEST_REVISION | TRANSFER
  "feedback": "审核意见",
  "transferToUserId": "新审核人ID（TRANSFER时必填）",
  "attachmentIds": ["附件ID"]
}
```

### 申请解锁

```
POST /api/experiments/[id]/unlock-request
```

**请求体**
```json
{
  "reason": "解锁原因"
}
```

**查询参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| viewMode | string | `default` 或 `global` |

---

## 项目接口

### 获取项目列表

```
GET /api/projects
```

### 创建项目

```
POST /api/projects
```

**请求体**
```json
{
  "name": "项目名称",
  "description": "项目描述"
}
```

### 获取项目详情

```
GET /api/projects/[id]
```

### 更新项目状态

```
POST /api/projects/[id]/status
```

**请求体**
```json
{
  "action": "complete"  // complete | reactivate | archive | unarchive
}
```

### 管理项目成员

```
POST /api/projects/[id]/members
```

**请求体**
```json
{
  "userId": "user-id",
  "role": "MEMBER"  // PROJECT_LEAD | MEMBER | VIEWER
}
```

---

## 用户管理接口

### 获取用户列表

```
GET /api/users
```

**需要权限**: 管理员或超级管理员

### 创建用户

```
POST /api/users
```

**请求体**
```json
{
  "name": "用户名",
  "email": "user@example.com",
  "password": "password123",
  "role": "RESEARCHER"
}
```

### 更新用户

```
PUT /api/users/[id]
```

### 禁用/启用用户

```
PATCH /api/users/[id]/status
```

**请求体**
```json
{
  "isActive": false
}
```

---

## 解锁申请接口

### 获取解锁申请列表

```
GET /api/unlock-requests
```

**查询参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 按状态筛选 PENDING/APPROVED/REJECTED |

### 处理解锁申请

```
POST /api/unlock-requests/[id]/process
```

**请求体**
```json
{
  "action": "approve",  // approve | reject
  "response": "处理说明"
}
```

---

## AI配置接口（超级管理员）

### 获取AI配置列表

```
GET /api/ai-config
```

### 创建/更新AI配置

```
POST /api/ai-config
```

**请求体**
```json
{
  "provider": "openai",
  "apiKey": "sk-xxx",
  "apiEndpoint": "https://api.openai.com/v1",
  "modelName": "gpt-4",
  "isActive": true
}
```

### 删除AI配置

```
DELETE /api/ai-config?id=[config-id]
```

---

## 错误响应格式

```json
{
  "error": "错误信息描述"
}
```

### 常见HTTP状态码

| 状态码 | 说明 |
|-------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（未登录） |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
