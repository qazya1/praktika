import os
from pathlib import Path

TEST_DB = Path(__file__).with_name("test.db")
if TEST_DB.exists():
    TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["DEV_AUTH"] = "true"
os.environ["MANAGER_URL"] = ""
os.environ["JWT_SECRET"] = "test-secret-that-is-at-least-32-bytes-long"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def login_client(client: TestClient) -> str:
    response = client.post(
        "/api/auth/messenger",
        json={"platform": "telegram", "init_data": "dev:42:Тестовый пользователь"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def login_staff(client: TestClient, username: str, password: str) -> str:
    response = client.post("/api/staff/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_main_order_flow_and_roles():
    with TestClient(app) as client:
        menu = client.get("/api/menu")
        assert menu.status_code == 200
        assert len(menu.json()) >= 3
        assert menu.json()[0]["image_url"]

        client_token = login_client(client)
        first_product = menu.json()[0]
        created = client.post(
            "/api/orders",
            headers=auth_header(client_token),
            json={
                "customer_name": "Иван",
                "phone": "+70000000000",
                "items": [{"product_id": first_product["id"], "quantity": 2}],
            },
        )
        assert created.status_code == 201
        order_id = created.json()["id"]
        assert created.json()["status"] == "new"
        assert created.json()["total"] == float(first_product["price"]) * 2

        mine = client.get("/api/orders/me", headers=auth_header(client_token))
        assert mine.status_code == 200
        assert mine.json()[0]["id"] == order_id

        cashier = login_staff(client, "cashier", "cashier123")
        cook = login_staff(client, "cook", "cook123")

        forbidden = client.patch(
            f"/api/staff/orders/{order_id}/status",
            headers=auth_header(cook),
            json={"status": "ready"},
        )
        assert forbidden.status_code == 409

        cooking = client.patch(
            f"/api/staff/orders/{order_id}/status",
            headers=auth_header(cashier),
            json={"status": "cooking"},
        )
        assert cooking.status_code == 200

        ready = client.patch(
            f"/api/staff/orders/{order_id}/status",
            headers=auth_header(cook),
            json={"status": "ready"},
        )
        assert ready.status_code == 200

        completed = client.patch(
            f"/api/staff/orders/{order_id}/status",
            headers=auth_header(cashier),
            json={"status": "completed"},
        )
        assert completed.status_code == 200
        assert completed.json()["status"] == "completed"


def test_invalid_product_is_rejected():
    with TestClient(app) as client:
        token = login_client(client)
        response = client.post(
            "/api/orders",
            headers=auth_header(token),
            json={"customer_name": "Иван", "items": [{"product_id": 999999, "quantity": 1}]},
        )
        assert response.status_code == 400
