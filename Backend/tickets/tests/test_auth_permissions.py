from .base import BaseTicketTest


class AuthAndPermissionTests(BaseTicketTest):
    def test_requires_authentication(self):
        res = self.api().get("/api/tickets/")
        self.assertEqual(res.status_code, 401)
        self.assertIn("error", res.data)

    def test_jwt_login_and_me(self):
        res = self.api().post("/api/auth/token/", {"username": "clienta", "password": "pw-12345-x"})
        self.assertEqual(res.status_code, 200)
        c = self.api()
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        me = c.get("/api/auth/me/")
        self.assertEqual(me.data["role"], "CLIENT")
        bad = self.api().post("/api/auth/token/", {"username": "clienta", "password": "nope"})
        self.assertEqual(bad.status_code, 401)

    def test_visibility_is_enforced_per_role(self):
        tid = self.create_ticket().data["id"]
        visible = lambda u: self.api(u).get("/api/tickets/").data["count"]  # noqa: E731
        self.assertEqual(visible(self.client_user), 1)
        self.assertEqual(visible(self.fm), 1)
        self.assertEqual(visible(self.tech_poc), 1)
        self.assertEqual(visible(self.client_user_b), 0)   # other client
        self.assertEqual(visible(self.other_fm), 0)        # other property
        self.assertEqual(visible(self.it_poc), 0)          # other department
        self.assertEqual(visible(self.tech_worker), 0)     # not assigned yet
        self.assertEqual(self.api(self.client_user_b).get(f"/api/tickets/{tid}/").status_code, 404)
        self.api(self.tech_poc).post(f"/api/tickets/{tid}/assign-worker/", {"worker": self.tech_worker.pk})
        self.assertEqual(visible(self.tech_worker), 1)

    def test_action_permissions_enforced_on_backend(self):
        tid = self.create_ticket().data["id"]
        # FM sees the ticket but has no assign permission -> 403 (not just a hidden button).
        res = self.api(self.fm).post(f"/api/tickets/{tid}/assign-worker/", {"worker": self.tech_worker.pk})
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.data["error"]["code"], "permission_denied")
        # Client cannot assign either, and POC cannot resolve on behalf of the client.
        self.assertEqual(self.api(self.client_user).post(f"/api/tickets/{tid}/assign-worker/", {"worker": 1}).status_code, 403)
        self.assertEqual(self.api(self.tech_poc).post(f"/api/tickets/{tid}/resolve/").status_code, 403)
        # Workers cannot create tickets; clients cannot raise tickets for others' clients.
        self.assertEqual(self.create_ticket(user=self.tech_worker).status_code, 403)
        self.assertEqual(self.create_ticket(user=self.client_user, client=self.client_b.pk).status_code, 400)
        # A worker from another department can't be assigned.
        res = self.api(self.tech_poc).post(f"/api/tickets/{tid}/assign-worker/", {"worker": self.it_worker.pk})
        self.assertEqual(res.status_code, 400)

    def test_available_actions_reflect_role_and_state(self):
        tid = self.create_ticket().data["id"]
        get = lambda u: self.api(u).get(f"/api/tickets/{tid}/").data["available_actions"]  # noqa: E731
        self.assertEqual(get(self.tech_poc), ["comment", "assign_worker", "change_department"])
        self.assertEqual(get(self.client_user), ["comment", "resolve"])
        self.assertEqual(get(self.fm), ["comment"])

