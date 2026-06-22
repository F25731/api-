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

容器内部端口是 `8765`，宿主机默认映射为 `8787:8765`，访问：

```text
http://服务器IP:8787
http://服务器IP:8787/admin
```

后台配置会保存在 Docker volume `yunyi-parser-data` 中。

## 常用命令

```bash
docker compose ps
docker compose logs -f
docker compose down
```
