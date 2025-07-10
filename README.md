# NB Music API V2.0 文档

更新时间：2025年7月9日 第一次修改

服务器由 Express.js 编写。由MySQL作为数据库，Redis作为内存数据库。
若数据库环境无法正常运行，将自动切换至SQLite文件数据库。

## NB Music 映射系统简介

映射，是指建立B站视频和网易云音乐id之间的关联所建立的映射。
映射储存在由@budingxiaocai提供的服务器里。
同时可以通过映射访问人数统计出热门歌曲、新增映射统计出新增的歌曲等等。
作为映射系统的拓展，允许用户自定义和上传歌曲、修改歌曲的各种信息等。

映射系统可以有效的解决：
- 歌词货不对板
- 首页没东西显示
- 上传不了歌曲
- 等阿巴阿巴的问题
 
## 基础信息

- **Base URL**: `https://nb-music.js.cool/api/v2`
- **认证方式**: `Authorization: Bearer <Session Token>`
- **请求/响应数据格式**: `application/json`
- **错误响应**: 
```json
{
  "status": "number, 状态码",
  "message": "string, 错误信息",
  "data": null
}
```

## 认证相关

### 1. 用户登录

**Endpoint**: `POST /auth/login`

**Headers**:
- `Cookie`：用户登录后B站API返回的Cookie

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": {
    "sessionId": "string, 会话token",
    "expiresIn": "number, 过期时间(秒)"
  }
}
```

### 2. 检查会话是否需要续期

**Endpoint**: `GET /auth/renewal`

**Headers**:
- `Authorization`: `Bearer <Session Token>`

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": {
    "needRenewal": "boolean, 是否需要续期",
    "expiresIn": "number, 过期时间(秒)"
  }
}
```

### 3. 会话续期

**Endpoint**: `POST /auth/renewal`

**Headers**:
- `Authorization`: `Bearer <Session Token>`

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": {
    "expiresIn": "number, 过期时间(秒)"
  }
}
```

### 4. 注销会话

**Endpoint**: `POST /auth/logout`

**Headers**:
- `Authorization`: `Bearer <Session Token>`

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": null
}
```

## 音乐标签相关

### 1. 获取音乐标签列表

**Endpoint**: `GET /tag`

**查询参数**:
- `page`: 页码 (默认1)
- `limit`: 每页数量 (默认15)
- `search`: 搜索关键词 (可选)

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": {
    "tags": [
       {
          "name": "string, 标签名称",
          "id": "string, 标签ID"
       }
    ],
    "limit": "number, 每页数量",
    "page": "number, 当前页",
    "total": "number, 总数", 
    "pageTotal": "number, 总页数"
  }
}
```

### 2. 创建音乐标签（仅管理员可用）

**Endpoint**: `POST /tag`

**Headers**:
- `Authorization`: `Bearer <Session Token>`
- `Content-Type`: `application/json`

**请求体**:
```json
{
  "name": "string, required, 标签名称",
  "color": "string, optional, 标签颜色"
}
```

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": null
}
```

### 3. 修改音乐标签（仅管理员可用）

**Endpoint**: `PUT /tag/{tagId}`

**Headers**:
- `Authorization`: `Bearer <Session Token>`
- `Content-Type`: `application/json`

**请求体**:
```json
{
  "name": "string, optional, 标签名称",
  "color": "string, optional, 标签颜色"
}
```

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": null
}
```

### 4. 删除音乐标签（仅管理员可用）

**Endpoint**: `DELETE /tag/{tagId}`

**Headers**:
- `Authorization`: `Bearer <Session Token>`

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": null
}
```

## 映射管理

### 1. 获取映射列表

**Endpoint**: `GET /mapping`

**查询参数**:
- `page`: 页码 (默认1)
- `limit`: 每页数量 (默认20)
- `sort`: 排序方式 (可选: `newest`, `popular`, 默认`newest`)
- `search`: 搜索关键词 (可选)

**Headers**:
- `Authorization`: `Bearer <Session Token>`

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": {
    "mappings": [
      {
        "status": "string, 映射状态(normal|reviewing|rejected)",
        "id": "string, 映射ID",
        "bvid": "string, B站视频BV号",
        "songName": "string, 歌曲名称",
        "artist": "string, 艺术家",
        "cover": "string, 封面URL",
        "neteasecloudId": "string, 网易云歌曲ID",
        "uploader": "string, 上传者B站UID",
        "playCount": "number, 播放次数",
        "createdAt": "number, 创建时间(秒)",
        "updatedAt": "number, 修改时间(秒)",
        "isPublic": "boolean, 是否公开", 
        "tags": [
           "string, 标签ID"
        ],
        "rejectReason": "string, 驳回原因, 仅在status为rejected时存在"
      }
    ],
    "total": "number, 总数",
    "page": "number, 当前页",
    "limit": "number, 每页数量"
  }
}
```

### 2. 创建映射

**Endpoint**: `POST /mapping`

**Headers**:
- `Authorization`: `Bearer <Session Token>`
- `Content-Type`: `application/json`

**请求体**:
```json
{
  "bvid": "string, required, B站视频BV号",
  "neteasecloudId": "string, required, 网易云歌曲ID",
  "songName": "string, required, 歌曲名称",
  "artist": "string, required, 艺术家",
  "cover": "string, optional, 封面URL",
  "tags": [
     "string, 标签ID"
  ],
  "isPublic": "boolean, optional, 是否公开，默认false（注：公开的映射将由管理员审核，经审核后才会被纳入全局映射数据库。若上传者为管理员，则直接通过）"
}
```

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": null
}
```

### 3. 修改映射

**Endpoint**: `PUT /mapping/{mappingId}`

**Headers**:
- `Authorization`: `Bearer <Session Token>`
- `Content-Type`: `application/json`

**请求体**:
```json
{
  "bvid": "string, optional, B站视频BV号",
  "neteasecloudId": "string, optional, 网易云歌曲ID",
  "songName": "string, optional, 歌曲名称",
  "artist": "string, optional, 艺术家",
  "cover": "string, optional, 封面URL",
  "tags": [
     "string, 标签ID"
  ],
  "isPublic": "boolean, optional, 是否公开"
}
```

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": null
}
```

### 4. 删除映射

**Endpoint**: `DELETE /mapping/{mappingId}`

**Headers**:
- `Authorization`: `Bearer <Session Token>`

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": null
}
```

## 历史记录

### 1. 获取历史记录

**Endpoint**: `GET /history`

**查询参数**:
- `page`: 页码 (默认1)
- `limit`: 每页数量 (默认20)
- `search`: 搜索关键词 (可选)

**Headers**:
- `Authorization`: `Bearer <Session Token>`

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": {
    "history": [
      "string, B站视频BV号, 由新到旧排序"
    ],
    "total": "number, 总数",
    "page": "number, 当前页",
    "limit": "number, 每页数量"
  }
}
```

### 2. 删除历史记录

**Endpoint**: `DELETE /history/{BVID}`

**Headers**:
- `Authorization`: `Bearer <Session Token>`

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": null
}
```

## 歌单管理

### 1. 获取歌单

**Endpoint**: `GET /playlists`

**查询参数**:
- `page`: 页码 (默认1)
- `limit`: 每页数量 (默认20)
- `sort`: 排序方式 (可选: `newest`, `popular`, 默认`newest`)
- `search`: 搜索关键词 (可选)

**Headers**:
- `Authorization`: `Bearer <Session Token>`

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": {
    "playlists": [
      {
        "id": "string, 歌单ID",
        "name": "string, 歌单名称",
        "description": "string, 描述",
        "cover": "string, 封面URL",
        "songCount": "number, 歌曲数量",
        "createdAt": "number, 创建时间(秒)",
        "updatedAt": "number, 更新时间(秒)"
      }
    ],
    "total": "number, 总数",
    "page": "number, 当前页",
    "limit": "number, 每页数量"
  }
}
```

### 2. 获取指定ID的歌单信息

**Endpoint**: `GET /playlist/{playlistId}`

**Headers**:
- `Authorization`: `Bearer <Session Token>`

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": {
     "id": "string, 歌单ID",
     "name": "string, 歌单名称",
     "description": "string, 描述",
     "cover": "string, 封面URL",
     "songCount": "number, 歌曲数量",
     "createdAt": "number, 创建时间(秒)",
     "updatedAt": "number, 更新时间(秒)"
  }
}
```

### 3. 创建歌单

**Endpoint**: `POST /playlist`

**Headers**:
- `Authorization`: `Bearer <Session Token>`
- `Content-Type: application/json`

**请求体**:
```json
{
  "name": "string, required, 歌单名称",
  "description": "string, optional, 描述",
  "cover": "string, optional, 封面URL",
  "songs": [
    "optional, 初始歌曲列表",
    "string, B站视频BV号"
  ]
}
```

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": null
}
```

### 4. 修改歌单信息

**Endpoint**: `PUT /playlist/{playlistId}`

**Headers**:
- `Authorization`: `Bearer <Session Token>`
- `Content-Type: application/json`

**请求体**:
```json
{
  "name": "string, optional, 歌单名称",
  "description": "string, optional, 描述",
  "cover": "string, optional, 封面URL"
}
```

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": null
}
```

### 5. 删除歌单

**Endpoint**: `DELETE /playlist/{playlistId}`

**Headers**:
- `Authorization`: `Bearer <Session Token>`

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": null
}
```

### 6. 获取歌单内歌曲

**Endpoint**: `GET /playlist/{playlistId}/songs`

**查询参数**:
- `page`: 页码 (默认1)
- `limit`: 每页数量 (默认20)
- `sort`: 排序方式 (可选: `newest`, `popular`, 默认`newest`)
- `search`: 搜索关键词 (可选)

**Headers**:
- `Authorization`: `Bearer <Session Token>`s

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": {
    "songs": [
      "string, B站视频BV号"
    ],
    "total": "number, 总数",
    "page": "number, 当前页",
    "limit": "number, 每页数量"
  }
}
```

### 7. 添加歌曲到歌单

**Endpoint**: `PUT /playlist/{playlistId}/song/{songId}`

**Headers**:
- `Authorization`: `Bearer <Session Token>`
- `Content-Type: application/json`

**请求体**:
```json
{
  "bvid": "string, B站视频BV号"
}
```

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": null
}
```

### 8. 删除歌单中的歌曲

**Endpoint**: `DELETE /playlist/{playlistId}/song/{songId}`

**Headers**:
- `Authorization`: `Bearer <Session Token>`
- `Content-Type: application/json`

**请求体**:
```json
{
  "bvid": "string, B站视频BV号"
}
```

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": null
}
```

## 歌曲推荐

### 1. 从B站获取热门音乐

**Endpoint**: `GET /recommend/bilibiliHot`

**查询参数**:
- `limit`: 推荐歌曲数量 (默认10)

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": {
    "songs": [
      "string, B站视频BV号"
    ],
    "limit": "number, 歌曲数量"
  }
}
```

### 2. 从映射中获取热门音乐

**Endpoint**: `GET /recommend/mappingHot`

**查询参数**:
- `limit`: 推荐歌曲数量 (默认10)

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": {
    "songs": [
       "string, B站视频BV号"
    ],
    "limit": "number, 歌曲数量"
  }
}
```

### 3. 获取用户最常听的歌曲

**Endpoint**: `GET /recommend/userHot`

**查询参数**:
- `limit`: 推荐歌曲数量 (默认10)

**Headers**:
- `Authorization`: `Bearer <Session Token>`

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": {
    "songs": [
      "string, B站视频BV号"
    ],
    "limit": "number, 歌曲数量"
  }
}
```

### 4. 从用户最常听的音乐标签中获取热门音乐

**Endpoint**: `GET /recommend/userTagHot`

**查询参数**:
- `limit`: 推荐歌曲数量 (默认10)

**Headers**:
- `Authorization`: `Bearer <Session Token>`

**成功响应**:
```json
{
   "status": 0,
   "message": "Success",
   "data": {
      "songs": [
         "string, B站视频BV号"
      ],
      "limit": "number, 歌曲数量"
   }
}
```

### 5. 从最热门的音乐标签中获取热门音乐

**Endpoint**: `GET /recommend/tagHot`

**查询参数**:
- `limit`: 推荐歌曲数量 (默认10)

**成功响应**:
```json
{
   "status": 0,
   "message": "Success",
   "data": {
      "songs": [
         "string, B站视频BV号"
      ],
      "limit": "number, 歌曲数量"
   }
}
```

## 播放统计

### 1. 记录播放

**Endpoint**: `POST /record`

**Headers**:
- `Authorization`: `Bearer <Session Token>`
- `Content-Type: application/json`

**请求体**:
```json
{
  "bvid": "string, required, B站视频BV号",
  "duration": "number, optional, 播放时长(秒)",
  "playlistId": "string, optional, 关联的歌单ID"
}
```

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": null
}
```

## 公开映射记录审核（仅管理员可用）

### 1. 获取待审核映射列表

**Endpoint**: `GET /review/mappings`

**查询参数**:
- `page`: 页码 (默认1)
- `limit`: 每页数量 (默认20)
- `search`: 搜索关键词 (可选)

**Headers**:
- `Authorization`: `Bearer <Session Token>`

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": {
    "mappings": [
      {
        "id": "string, 映射ID",
        "bvid": "string, B站视频BV号",
        "songName": "string, 歌曲名称",
        "artist": "string, 艺术家",
        "cover": "string, 封面URL",
        "neteasecloudId": "string, 网易云歌曲ID",
        "uploader": "string, 上传者B站UID",
        "createdAt": "number, 请求审核时间(秒)",
        "tags": [
           "string, 标签ID"
        ]
      }
    ],
    "total": "number, 总数",
    "page": "number, 当前页",
    "limit": "number, 每页数量"
  }
}
```

### 2. 通过审核

**Endpoint**: `POST /review/mapping/{mappingId}/approve`

**Headers**:
- `Authorization`: `Bearer <Session Token>`

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": null
}
```

### 3. 驳回审核

**Endpoint**: `POST /review/mapping/{mappingId}/reject`

**Headers**:
- `Authorization`: `Bearer <Session Token>`
- `Content-Type`: `application/json`

**请求体**:
```json
{
  "reason": "string, required, 驳回原因"
}
```

**成功响应**:
```json
{
  "status": 0,
  "message": "Success",
  "data": null
}
```

## 前端开发注意事项

1. **搜索与获取歌曲信息**：
   - 服务器不提供搜索API，前端应直接调用各平台API进行搜索
   - 服务器只负责存储和提供映射关系

2. **关于 仅管理员可用 API**：
   - 不应在前端中直接使用此API
   - 此API应仅在管理员后台面板上执行


## 可能出现的错误
- HTTP 状态码 `200` 内部状态码 `0` ：访问正常。
- HTTP 状态码 `500` 内部状态码 `-1` ：服务器内部错误。
- HTTP 状态码 `503` 内部状态码 `-1` ：当前接口不可用。
- HTTP 状态码 `400` 内部状态码 `-2` ：请求参数有误。
- HTTP 状态码 `404` 内部状态码 `-3` ：用户不存在（通常出现在登录接口）。
- HTTP 状态码 `401` 内部状态码 `-4` ：未登录或会话过期，请重新登录。
- HTTP 状态码 `409` 内部状态码 `-5` ：资源冲突。
- HTTP 状态码 `404` 内部状态码 `-6` ：资源不存在。
- HTTP 状态码 `403` 内部状态码 `-7` ：无权限访问。
- HTTP 状态码 `403` 内部状态码 `-8` ：触发了访问频率限制，请稍后再试。