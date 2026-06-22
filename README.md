# 云逸解析

聚合解析站点，包含前台解析页、后台 API 配置页和服务端转发层。

## 本地运行

```bash
npm start
```

默认访问地址：

```text
http://127.0.0.1:8765
```

后台地址：

```text
http://127.0.0.1:8765/admin
```

## Docker Compose 部署

```bash
docker compose up -d --build
```

容器默认映射端口为 `8765:8765`。后台配置会保存在 Docker volume `yunyi-parser-data` 中。
