import { expect, test } from "@playwright/test";

test("register, create, filter, complete and delete", async ({ page }) => {
  const suffix = Date.now();
  const email = `smoke-${suffix}@orbit.test`;
  const password = "StrongTestPassword123!";

  await page.goto("/");
  await page.getByRole("tab", { name: "Register" }).click();
  await page.getByLabel("Name").fill("Smoke User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.getByPlaceholder("Project name").fill("Smoke Project");
  await page.getByPlaceholder("Description").first().fill("Smoke project description");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByText("Smoke Project")).toBeVisible();

  await page.getByPlaceholder("Task name").fill("Smoke Task");
  await page.getByPlaceholder("Description").last().fill("Smoke task description");
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page.getByText("Smoke Task")).toBeVisible();

  await page.getByPlaceholder("Search tasks").fill("Smoke");
  await expect(page.getByText("Smoke Task")).toBeVisible();

  await page.getByRole("button", { name: "Complete" }).click();
  await expect(page.getByText("completed / medium")).toBeVisible();

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Delete this task?");
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Delete" }).last().click();
  await expect(page.getByText("Smoke Task")).toBeHidden();
});
