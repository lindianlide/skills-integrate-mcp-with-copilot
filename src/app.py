"""
High School Management System API

A FastAPI application that allows teachers to manage and students to view and sign up
for extracurricular activities at Mergington High School.
"""

import json
import hashlib
from typing import Optional
from datetime import datetime, timedelta
from pathlib import Path
from fastapi import FastAPI, HTTPException, Security, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import os

app = FastAPI(title="明灵顿高中 API",
              description="用于查看和报名课外活动的 API")

# 挂载静态文件目录
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(current_dir, "static")), name="static")

# 内存中的活动数据库
activities = {
    "象棋社": {
        "description": "学习策略并参加象棋比赛",
        "schedule": "每周五，下午3:30 - 5:00",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "编程课": {
        "description": "学习编程基础并完成软件项目",
        "schedule": "每周二和周四，下午3:30 - 4:30",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "体育课": {
        "description": "体育教育和运动活动",
        "schedule": "每周一、三、五，下午2:00 - 3:00",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    },
}

# 安全相关
security = HTTPBearer()

def get_teachers():
    """从 JSON 文件读取教师数据"""
    teachers_file = current_dir / "static" / "teachers.json"
    if not teachers_file.exists():
        return {"teachers": []}
    with open(teachers_file, "r") as f:
        return json.load(f)

def verify_password(password: str, hashed_password: str) -> bool:
    """验证密码"""
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    return password_hash == hashed_password

async def authenticate_teacher(credentials: HTTPAuthorizationCredentials = Security(security)):
    """验证教师身份"""
    try:
        token = credentials.credentials
        # 在实际应用中，这里应该使用 JWT 验证
        # 目前为简单示例，仅检查 token 格式
        if not token or "teacher" not in token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效凭证"
            )
        return token
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效凭证"
        )

# 数据模型
class LoginRequest(BaseModel):
    username: str
    password: str

class Activity(BaseModel):
    description: str
    schedule: str
    max_participants: int
    participants: Optional[list[str]] = []

@app.get("/")
def root():
    """重定向到首页"""
    return RedirectResponse(url="/static/index.html")

@app.post("/admin/login")
def login(request: LoginRequest):
    """教师登录"""
    teachers_data = get_teachers()
    for teacher in teachers_data["teachers"]:
        if teacher["username"] == request.username and verify_password(request.password, teacher["password"]):
            # 在实际应用中，这里应该生成 JWT token
            return {"token": f"teacher_{request.username}"}
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="用户名或密码错误"
    )

@app.get("/activities")
def get_activities():
    """获取所有活动"""
    return activities

@app.get("/activities/{activity_name}")
def get_activity(activity_name: str):
    """获取特定活动的详情"""
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="未找到该活动")
    return activities[activity_name]

@app.post("/activities", dependencies=[Depends(authenticate_teacher)])
def create_activity(activity_name: str, activity: Activity):
    """创建新活动"""
    if activity_name in activities:
        raise HTTPException(
            status_code=400,
            detail="该活动已存在"
        )
    
    activities[activity_name] = activity.model_dump()
    return {"message": f"活动 {activity_name} 创建成功"}

@app.put("/activities/{activity_name}", dependencies=[Depends(authenticate_teacher)])
def update_activity(activity_name: str, activity: Activity):
    """更新活动信息"""
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="未找到该活动")
    
    current_participants = activities[activity_name]["participants"]
    if len(current_participants) > activity.max_participants:
        raise HTTPException(
            status_code=400,
            detail="无法将最大参与人数设置为小于当前参与人数"
        )
    
    activity_data = activity.model_dump()
    activity_data["participants"] = current_participants
    activities[activity_name] = activity_data
    return {"message": f"活动 {activity_name} 更新成功"}

@app.delete("/activities/{activity_name}", dependencies=[Depends(authenticate_teacher)])
def delete_activity(activity_name: str):
    """删除活动"""
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="未找到该活动")
    
    del activities[activity_name]
    return {"message": f"活动 {activity_name} 删除成功"}

@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str):
    """学生报名活动"""
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="未找到该活动")

    activity = activities[activity_name]

    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="该学生已报名此活动"
        )

    if len(activity["participants"]) >= activity["max_participants"]:
        raise HTTPException(
            status_code=400,
            detail="该活动已达到最大参与人数"
        )

    activity["participants"].append(email)
    return {"message": f"{email} 成功报名 {activity_name}"}

@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(
    activity_name: str,
    email: str,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security, auto_error=False)
):
    """取消活动报名（学生自己或教师都可以）"""
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="未找到该活动")

    activity = activities[activity_name]

    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="该学生未报名此活动"
        )

    # 如果是教师操作，不需要验证邮箱
    is_teacher = False
    if credentials:
        try:
            token = credentials.credentials
            is_teacher = "teacher" in token
        except Exception:
            pass

    activity["participants"].remove(email)
    action = "已被退出" if is_teacher else "已退出"
    return {"message": f"{email} {action} {activity_name}"}