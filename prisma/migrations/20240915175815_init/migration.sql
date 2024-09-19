-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `cash` INTEGER NOT NULL DEFAULT 10000,
    `creatrdAt` DATETIME(3) NOT NULL,
    `winCount` INTEGER NOT NULL,
    `looseCount` INTEGER NOT NULL,

    UNIQUE INDEX `User_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeamInternal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(191) NOT NULL,
    `playerId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Team` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teamInternalId` INTEGER NOT NULL,
    `playerWaitingListId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlayerWaitingList` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(191) NOT NULL,
    `playerId` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Player` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `playerId` VARCHAR(191) NOT NULL,
    `speed` INTEGER NOT NULL,
    `goalDecisiveness` INTEGER NOT NULL,
    `shootPower` INTEGER NOT NULL,
    `defense` INTEGER NOT NULL,
    `stamina` INTEGER NOT NULL,
    `tier` VARCHAR(191) NOT NULL,
    `price` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Player_playerId_key`(`playerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TeamInternal` ADD CONSTRAINT `TeamInternal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeamInternal` ADD CONSTRAINT `TeamInternal_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `Player`(`playerId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Team` ADD CONSTRAINT `Team_teamInternalId_fkey` FOREIGN KEY (`teamInternalId`) REFERENCES `TeamInternal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Team` ADD CONSTRAINT `Team_playerWaitingListId_fkey` FOREIGN KEY (`playerWaitingListId`) REFERENCES `PlayerWaitingList`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayerWaitingList` ADD CONSTRAINT `PlayerWaitingList_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayerWaitingList` ADD CONSTRAINT `PlayerWaitingList_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `Player`(`playerId`) ON DELETE RESTRICT ON UPDATE CASCADE;
