/*
  Warnings:

  - Made the column `entryPoint` on table `PluginVersion` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PluginVersion" ALTER COLUMN "entryPoint" SET NOT NULL;
