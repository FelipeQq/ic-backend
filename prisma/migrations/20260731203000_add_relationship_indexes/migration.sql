-- Indexes used by event/user cleanup queries and foreign-key checks.
CREATE INDEX "EventOnUsers_eventId_idx" ON "EventOnUsers"("eventId");
CREATE INDEX "EventOnUsersRolesRegistration_eventId_idx" ON "EventOnUsersRolesRegistration"("eventId");
CREATE INDEX "EventOnUsersRolesRegistration_roleRegistrationId_idx" ON "EventOnUsersRolesRegistration"("roleRegistrationId");
CREATE INDEX "EventOnUsersRolesRegistration_discountId_idx" ON "EventOnUsersRolesRegistration"("discountId");
CREATE INDEX "group_roles_eventId_idx" ON "group_roles"("eventId");
CREATE INDEX "roles_registration_types_groupId_idx" ON "roles_registration_types"("groupId");
CREATE INDEX "payments_eventId_idx" ON "payments"("eventId");
CREATE INDEX "payment_checkouts_paymentId_idx" ON "payment_checkouts"("paymentId");
CREATE INDEX "waitlist_eventId_idx" ON "waitlist"("eventId");
CREATE INDEX "waitlist_roleRegistrationId_idx" ON "waitlist"("roleRegistrationId");
CREATE INDEX "bedrooms_eventId_idx" ON "bedrooms"("eventId");
CREATE INDEX "BedroomsOnUsers_bedroomsId_idx" ON "BedroomsOnUsers"("bedroomsId");
CREATE INDEX "teams_eventId_idx" ON "teams"("eventId");
CREATE INDEX "TeamOnUsers_teamId_idx" ON "TeamOnUsers"("teamId");
