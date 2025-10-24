# 明灵顿高中课外活动管理系统

一个基于 FastAPI 的应用程序，允许教师管理课外活动，学生查看和报名参加课外活动。

## 功能特点

- 教师功能：
  - 登录管理后台
  - 添加、编辑、删除活动
  - 管理学生报名

- 学生功能：
  - 查看所有可用的课外活动
  - 报名参加活动
  - 取消报名

## 开始使用

1. 安装依赖：

   ```bash
   pip install -r requirements.txt
   ```

2. 运行应用：

   ```bash
   uvicorn app:app --reload
   ```

3. 在浏览器中访问：
   - API 文档：http://localhost:8000/docs
   - 替代文档：http://localhost:8000/redoc
   - 网页界面：http://localhost:8000

## API 端点

| 方法   | 端点                                                           | 描述                       | 权限     |
| ------ | -------------------------------------------------------------- | -------------------------- | -------- |
| GET    | `/activities`                                                  | 获取所有活动详情           | 所有用户 |
| POST   | `/admin/login`                                                 | 教师登录                   | 所有用户 |
| POST   | `/activities`                                                  | 创建新活动                 | 仅教师   |
| PUT    | `/activities/{activity_name}`                                  | 更新活动信息               | 仅教师   |
| DELETE | `/activities/{activity_name}`                                  | 删除活动                   | 仅教师   |
| POST   | `/activities/{activity_name}/signup?email=student@example.com` | 报名参加活动               | 所有用户 |
| DELETE | `/activities/{activity_name}/unregister?email=student@example.com` | 取消活动报名               | 所有用户/教师 |

## 数据模型

应用使用简单的数据模型：

1. **活动 (Activities)**：
   - 名称（作为标识符）
   - 描述
   - 时间安排
   - 最大参与人数
   - 参与者列表（学生邮箱）

2. **教师账户**：
   - 用户名
   - 密码（SHA-256 哈希）

所有数据都存储在内存中，这意味着服务器重启时数据会重置。在实际应用中，应该使用数据库持久化存储。

## 安全性

- 使用 Bearer token 进行认证
- 密码使用 SHA-256 哈希存储
- 基于角色的访问控制：
  - 教师可以管理所有活动
  - 学生可以查看活动并管理自己的报名

## 开发说明

1. **教师认证**：
   - 默认的教师账户存储在 `static/teachers.json` 中
   - 密码使用 SHA-256 哈希存储
   - 登录成功后返回 token

2. **活动管理**：
   - 创建活动时需要指定名称、描述、时间安排和最大参与人数
   - 更新活动时不能将最大参与人数设置为小于当前参与人数
   - 删除活动时会同时删除所有报名记录

3. **报名管理**：
   - 学生可以自由报名和取消报名
   - 教师可以代替学生取消报名
   - 系统会自动检查活动容量限制