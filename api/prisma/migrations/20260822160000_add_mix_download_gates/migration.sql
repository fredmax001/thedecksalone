-- AlterTable
ALTER TABLE "mixes" ADD COLUMN     "allowPublicDownloads" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "repostToDownload" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "followToDownload" BOOLEAN NOT NULL DEFAULT false;
