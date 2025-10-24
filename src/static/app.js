document.addEventListener("DOMContentLoaded", () => {
  // DOM 元素
  const adminLoginForm = document.getElementById("admin-login-form");
  const adminPanel = document.getElementById("admin-panel");
  const adminLoginSection = document.getElementById("admin-login");
  const activitiesList = document.getElementById("activities-list");
  const adminActivitiesList = document.getElementById("admin-activities-list");
  const addActivityButton = document.getElementById("add-activity");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const adminMessageDiv = document.getElementById("admin-message");

  let isAdmin = false;

  // 管理员登录处理
  adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("admin-username").value;
    const password = document.getElementById("admin-password").value;

    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        isAdmin = true;
        adminLoginSection.classList.add("hidden");
        adminPanel.classList.remove("hidden");
        fetchActivities(true);
      } else {
        const error = await response.json();
        showMessage(adminMessageDiv, error.detail || "登录失败", "error");
      }
    } catch (error) {
      showMessage(adminMessageDiv, "登录时发生错误", "error");
    }
  });

  // 添加新活动
  addActivityButton.addEventListener("click", () => {
    const activityForm = document.createElement("form");
    activityForm.className = "activity-form";
    activityForm.innerHTML = `
      <h4>添加新活动</h4>
      <div class="form-group">
        <label for="activity-name">活动名称：</label>
        <input type="text" id="activity-name" required>
      </div>
      <div class="form-group">
        <label for="activity-description">活动描述：</label>
        <textarea id="activity-description" required></textarea>
      </div>
      <div class="form-group">
        <label for="activity-schedule">活动时间：</label>
        <input type="text" id="activity-schedule" required>
      </div>
      <div class="form-group">
        <label for="activity-max">最大参与人数：</label>
        <input type="number" id="activity-max" min="1" required>
      </div>
      <button type="submit">保存</button>
      <button type="button" class="cancel-btn">取消</button>
    `;

    activityForm.addEventListener("submit", handleNewActivity);
    activityForm.querySelector(".cancel-btn").addEventListener("click", () => {
      activityForm.remove();
    });

    adminActivitiesList.insertBefore(activityForm, adminActivitiesList.firstChild);
  });

  // 处理新活动提交
  async function handleNewActivity(event) {
    event.preventDefault();
    const form = event.target;
    const activityData = {
      name: form.querySelector("#activity-name").value,
      description: form.querySelector("#activity-description").value,
      schedule: form.querySelector("#activity-schedule").value,
      max_participants: parseInt(form.querySelector("#activity-max").value),
    };

    try {
      const response = await fetch("/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(activityData),
      });

      if (response.ok) {
        form.remove();
        fetchActivities(true);
        showMessage(adminMessageDiv, "活动创建成功", "success");
      } else {
        const error = await response.json();
        showMessage(adminMessageDiv, error.detail || "创建活动失败", "error");
      }
    } catch (error) {
      showMessage(adminMessageDiv, "创建活动时发生错误", "error");
    }
  }

  // 获取活动列表
  async function fetchActivities(adminView = false) {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // 清除加载信息
      activitiesList.innerHTML = "";
      if (adminView) {
        adminActivitiesList.innerHTML = "";
      }

      // 填充活动列表
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // 创建参与者列表
        const participantsHTML = details.participants.length > 0
          ? `<div class="participants-section">
              <h5>参与者：</h5>
              <ul class="participants-list">
                ${details.participants.map(email => 
                  `<li>
                    <span class="participant-email">${email}</span>
                    ${adminView ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ''}
                  </li>`
                ).join("")}
              </ul>
            </div>`
          : `<p><em>暂无参与者</em></p>`;

        // 添加管理员操作按钮
        const adminActions = adminView
          ? `<div class="activity-actions">
              <button class="edit-btn" data-activity="${name}">编辑</button>
              <button class="delete-activity-btn" data-activity="${name}">删除</button>
            </div>`
          : '';

        activityCard.innerHTML = `
          ${adminActions}
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>时间：</strong>${details.schedule}</p>
          <p><strong>剩余名额：</strong>${spotsLeft}个</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        if (adminView) {
          adminActivitiesList.appendChild(activityCard);
        } else {
          activitiesList.appendChild(activityCard);
        }

        // 更新下拉菜单选项
        if (!adminView) {
          const option = document.createElement("option");
          option.value = name;
          option.textContent = name;
          activitySelect.appendChild(option);
        }
      });

      // 添加事件监听器
      if (adminView) {
        document.querySelectorAll(".delete-btn").forEach(button => {
          button.addEventListener("click", handleUnregister);
        });
        document.querySelectorAll(".edit-btn").forEach(button => {
          button.addEventListener("click", handleEdit);
        });
        document.querySelectorAll(".delete-activity-btn").forEach(button => {
          button.addEventListener("click", handleDeleteActivity);
        });
      }
    } catch (error) {
      const message = "加载活动失败，请稍后重试。";
      if (adminView) {
        adminActivitiesList.innerHTML = `<p>${message}</p>`;
      } else {
        activitiesList.innerHTML = `<p>${message}</p>`;
      }
      console.error("Error fetching activities:", error);
    }
  }

  // 处理编辑活动
  async function handleEdit(event) {
    const activityName = event.target.getAttribute("data-activity");
    const activityCard = event.target.closest(".activity-card");
    
    try {
      const response = await fetch(`/activities/${encodeURIComponent(activityName)}`);
      const activity = await response.json();

      const editForm = document.createElement("form");
      editForm.className = "activity-form";
      editForm.innerHTML = `
        <h4>编辑活动</h4>
        <div class="form-group">
          <label for="edit-description">活动描述：</label>
          <textarea id="edit-description" required>${activity.description}</textarea>
        </div>
        <div class="form-group">
          <label for="edit-schedule">活动时间：</label>
          <input type="text" id="edit-schedule" value="${activity.schedule}" required>
        </div>
        <div class="form-group">
          <label for="edit-max">最大参与人数：</label>
          <input type="number" id="edit-max" min="1" value="${activity.max_participants}" required>
        </div>
        <button type="submit">保存</button>
        <button type="button" class="cancel-btn">取消</button>
      `;

      editForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const updatedData = {
          description: editForm.querySelector("#edit-description").value,
          schedule: editForm.querySelector("#edit-schedule").value,
          max_participants: parseInt(editForm.querySelector("#edit-max").value),
        };

        try {
          const updateResponse = await fetch(`/activities/${encodeURIComponent(activityName)}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedData),
          });

          if (updateResponse.ok) {
            fetchActivities(true);
            showMessage(adminMessageDiv, "活动更新成功", "success");
          } else {
            const error = await updateResponse.json();
            showMessage(adminMessageDiv, error.detail || "更新活动失败", "error");
          }
        } catch (error) {
          showMessage(adminMessageDiv, "更新活动时发生错误", "error");
        }
      });

      editForm.querySelector(".cancel-btn").addEventListener("click", () => {
        editForm.remove();
        activityCard.style.display = "block";
      });

      activityCard.style.display = "none";
      activityCard.parentNode.insertBefore(editForm, activityCard);
    } catch (error) {
      showMessage(adminMessageDiv, "获取活动详情失败", "error");
    }
  }

  // 处理删除活动
  async function handleDeleteActivity(event) {
    if (!confirm("确定要删除这个活动吗？此操作无法撤销。")) {
      return;
    }

    const activityName = event.target.getAttribute("data-activity");

    try {
      const response = await fetch(`/activities/${encodeURIComponent(activityName)}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchActivities(true);
        showMessage(adminMessageDiv, "活动删除成功", "success");
      } else {
        const error = await response.json();
        showMessage(adminMessageDiv, error.detail || "删除活动失败", "error");
      }
    } catch (error) {
      showMessage(adminMessageDiv, "删除活动时发生错误", "error");
    }
  }

  // 处理退出报名
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, result.message, "success");
        fetchActivities(isAdmin);
      } else {
        showMessage(messageDiv, result.detail || "操作失败", "error");
      }
    } catch (error) {
      showMessage(messageDiv, "退出报名失败，请重试", "error");
    }
  }

  // 处理报名表单提交
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, result.message, "success");
        signupForm.reset();
        fetchActivities(false);
      } else {
        showMessage(messageDiv, result.detail || "操作失败", "error");
      }
    } catch (error) {
      showMessage(messageDiv, "报名失败，请重试", "error");
    }
  });

  // 显示消息
  function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`;
    element.classList.remove("hidden");

    setTimeout(() => {
      element.classList.add("hidden");
    }, 5000);
  }

  // 初始化应用
  fetchActivities();
});