import { afterEach, expect, test, vi } from "vitest";
import { ApiError } from "../src/core/http/api-error";

vi.mock("../src/modules/plugin-installation/pluginInstallation.repository", () => ({
  pluginInstallationRepository: {
    findAllForUser: vi.fn(),
    findByUserAndPlugin: vi.fn(),
    findByUserAndPluginKey: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    updateEnabled: vi.fn(),
  },
}));

vi.mock("../src/modules/plugin-registry/pluginRegistry.repository", () => ({
  pluginRegistryRepository: {
    findById: vi.fn(),
    findByKey: vi.fn(),
  },
}));

import { pluginInstallationRepository } from "../src/modules/plugin-installation/pluginInstallation.repository";
import { pluginRegistryRepository } from "../src/modules/plugin-registry/pluginRegistry.repository";
import { pluginInstallationService } from "../src/modules/plugin-installation/pluginInstallation.service";

afterEach(() => {
  vi.clearAllMocks();
});

test("listInstalledForUser delegates to repository", async () => {
  const installed = [{ id: "install-1" }];
  vi.mocked(pluginInstallationRepository.findAllForUser).mockResolvedValue(installed as never);

  const result = await pluginInstallationService.listInstalledForUser("user-1");

  expect(pluginInstallationRepository.findAllForUser).toHaveBeenCalledWith("user-1");
  expect(result).toEqual(installed);
});

test("installPlugin creates installation for approved non-installed plugin", async () => {
  const plugin = { id: "plugin-1", isApproved: true };
  const created = { id: "install-1", userId: "user-1", pluginId: "plugin-1", isEnabled: true };
  vi.mocked(pluginRegistryRepository.findById).mockResolvedValue(plugin as never);
  vi.mocked(pluginInstallationRepository.findByUserAndPlugin).mockResolvedValue(null as never);
  vi.mocked(pluginInstallationRepository.create).mockResolvedValue(created as never);

  const result = await pluginInstallationService.installPlugin("user-1", "plugin-1");

  expect(pluginRegistryRepository.findById).toHaveBeenCalledWith("plugin-1");
  expect(pluginInstallationRepository.findByUserAndPlugin).toHaveBeenCalledWith("user-1", "plugin-1");
  expect(pluginInstallationRepository.create).toHaveBeenCalledWith({ userId: "user-1", pluginId: "plugin-1" });
  expect(result).toEqual(created);
});

test("installPlugin throws not found when plugin does not exist", async () => {
  vi.mocked(pluginRegistryRepository.findById).mockResolvedValue(null as never);

  await expect(
    pluginInstallationService.installPlugin("user-1", "plugin-404"),
  ).rejects.toMatchObject({
    status: 404,
    code: "NOT_FOUND",
  } satisfies Partial<ApiError>);
});

test("installPlugin throws forbidden when plugin is not approved", async () => {
  vi.mocked(pluginRegistryRepository.findById).mockResolvedValue({ id: "plugin-1", isApproved: false } as never);

  await expect(
    pluginInstallationService.installPlugin("user-1", "plugin-1"),
  ).rejects.toMatchObject({
    status: 403,
    code: "FORBIDDEN",
  } satisfies Partial<ApiError>);
});

test("installPlugin throws duplicate when plugin is already installed", async () => {
  vi.mocked(pluginRegistryRepository.findById).mockResolvedValue({ id: "plugin-1", isApproved: true } as never);
  vi.mocked(pluginInstallationRepository.findByUserAndPlugin).mockResolvedValue({ id: "install-1" } as never);

  await expect(
    pluginInstallationService.installPlugin("user-1", "plugin-1"),
  ).rejects.toMatchObject({
    status: 409,
    code: "DUPLICATE_RESOURCE",
  } satisfies Partial<ApiError>);
});

test("uninstallPlugin returns deleted installation", async () => {
  const deleted = { id: "install-1", userId: "user-1", pluginId: "plugin-1" };
  vi.mocked(pluginInstallationRepository.delete).mockResolvedValue(deleted as never);

  const result = await pluginInstallationService.uninstallPlugin("user-1", "plugin-1");

  expect(pluginInstallationRepository.delete).toHaveBeenCalledWith("user-1", "plugin-1");
  expect(result).toEqual(deleted);
});

test("uninstallPlugin throws not found when installation does not exist", async () => {
  vi.mocked(pluginInstallationRepository.delete).mockResolvedValue(null as never);

  await expect(
    pluginInstallationService.uninstallPlugin("user-1", "plugin-1"),
  ).rejects.toMatchObject({
    status: 404,
    code: "NOT_FOUND",
  } satisfies Partial<ApiError>);
});

test("updateInstallation validates payload and updates enabled flag", async () => {
  const updated = { id: "install-1", isEnabled: false };
  vi.mocked(pluginInstallationRepository.updateEnabled).mockResolvedValue(updated as never);

  const result = await pluginInstallationService.updateInstallation(
    "user-1",
    "plugin-1",
    { isEnabled: false },
  );

  expect(pluginInstallationRepository.updateEnabled).toHaveBeenCalledWith("user-1", "plugin-1", false);
  expect(result).toEqual(updated);
});

test("updateInstallation throws validation error for invalid payload", async () => {
  await expect(
    pluginInstallationService.updateInstallation("user-1", "plugin-1", { isEnabled: "nope" }),
  ).rejects.toMatchObject({
    status: 400,
    code: "VALIDATION_ERROR",
  } satisfies Partial<ApiError>);
});

test("updateInstallation throws validation error for numeric isEnabled", async () => {
  await expect(
    pluginInstallationService.updateInstallation("user-1", "plugin-1", { isEnabled: 1 }),
  ).rejects.toMatchObject({
    status: 400,
    code: "VALIDATION_ERROR",
  } satisfies Partial<ApiError>);
});

test("updateInstallation throws validation error when payload is missing isEnabled", async () => {
  await expect(
    pluginInstallationService.updateInstallation("user-1", "plugin-1", {}),
  ).rejects.toMatchObject({
    status: 400,
    code: "VALIDATION_ERROR",
  } satisfies Partial<ApiError>);
});

test("updateInstallation throws validation error when payload is null", async () => {
  await expect(
    pluginInstallationService.updateInstallation("user-1", "plugin-1", null),
  ).rejects.toMatchObject({
    status: 400,
    code: "VALIDATION_ERROR",
  } satisfies Partial<ApiError>);
});

test("updateInstallation throws not found when installation is missing", async () => {
  vi.mocked(pluginInstallationRepository.updateEnabled).mockResolvedValue(null as never);

  await expect(
    pluginInstallationService.updateInstallation("user-1", "plugin-1", { isEnabled: true }),
  ).rejects.toMatchObject({
    status: 404,
    code: "NOT_FOUND",
  } satisfies Partial<ApiError>);
});

test("assertPluginInstalledAndEnabled bypasses checks for non-registry plugin keys", async () => {
  vi.mocked(pluginRegistryRepository.findByKey).mockResolvedValue(null as never);

  await expect(
    pluginInstallationService.assertPluginInstalledAndEnabled("user-1", "builtin-clockDate"),
  ).resolves.toBeUndefined();

  expect(pluginInstallationRepository.findByUserAndPluginKey).not.toHaveBeenCalled();
});

test("assertPluginInstalledAndEnabled throws when registry plugin is not installed", async () => {
  vi.mocked(pluginRegistryRepository.findByKey).mockResolvedValue({ id: "plugin-1" } as never);
  vi.mocked(pluginInstallationRepository.findByUserAndPluginKey).mockResolvedValue(null as never);

  await expect(
    pluginInstallationService.assertPluginInstalledAndEnabled("user-1", "weather-pro"),
  ).rejects.toMatchObject({
    status: 403,
    code: "FORBIDDEN",
    message: "Plugin 'weather-pro' is not installed",
  } satisfies Partial<ApiError>);
});

test("assertPluginInstalledAndEnabled throws when registry plugin is disabled", async () => {
  vi.mocked(pluginRegistryRepository.findByKey).mockResolvedValue({ id: "plugin-1" } as never);
  vi.mocked(pluginInstallationRepository.findByUserAndPluginKey).mockResolvedValue({ isEnabled: false } as never);

  await expect(
    pluginInstallationService.assertPluginInstalledAndEnabled("user-1", "weather-pro"),
  ).rejects.toMatchObject({
    status: 403,
    code: "FORBIDDEN",
    message: "Plugin 'weather-pro' is disabled",
  } satisfies Partial<ApiError>);
});

test("assertPluginInstalledAndEnabled passes when registry plugin is installed and enabled", async () => {
  vi.mocked(pluginRegistryRepository.findByKey).mockResolvedValue({ id: "plugin-1" } as never);
  vi.mocked(pluginInstallationRepository.findByUserAndPluginKey).mockResolvedValue({ isEnabled: true } as never);

  await expect(
    pluginInstallationService.assertPluginInstalledAndEnabled("user-1", "weather-pro"),
  ).resolves.toBeUndefined();
});
