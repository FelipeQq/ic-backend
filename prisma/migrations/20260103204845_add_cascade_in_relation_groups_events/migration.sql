-- DropForeignKey
ALTER TABLE "EventOnUsersRolesRegistration" DROP CONSTRAINT "EventOnUsersRolesRegistration_roleRegistrationId_fkey";

-- DropForeignKey
ALTER TABLE "group_roles" DROP CONSTRAINT "group_roles_eventId_fkey";

-- DropForeignKey
ALTER TABLE "roles_registration_types" DROP CONSTRAINT "roles_registration_types_groupId_fkey";

-- AddForeignKey
ALTER TABLE "EventOnUsersRolesRegistration" ADD CONSTRAINT "EventOnUsersRolesRegistration_roleRegistrationId_fkey" FOREIGN KEY ("roleRegistrationId") REFERENCES "roles_registration_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_roles" ADD CONSTRAINT "group_roles_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles_registration_types" ADD CONSTRAINT "roles_registration_types_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
