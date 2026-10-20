package com.nuri.walk

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

// Public synthetic literals. These are not credentials or device identities.
class WalkSupplementalGuardTest {
  private val owner = "11111111-1111-4111-8111-111111111111"
  private val pet = "22222222-2222-4222-8222-222222222222"
  private val foreign = "33333333-3333-4333-8333-333333333333"
  private val session = "44444444-4444-4444-8444-444444444444"
  private val marker = "NQ0123456789ab"
  private val origin = "https://fixture.invalid"
  private val create = "$origin/rest/v1/pets?select=id,user_id,name"
  private fun bound(): SupplementalGuard = SupplementalGuard(marker, origin).apply {
    install(false); assertTrue(claimCreation("POST", create, marker)); created(create, owner, owner, pet, marker)
  }
  private fun delete(id: String = pet, actor: String = owner) = "$origin/rest/v1/pets?id=eq.$id&user_id=eq.$actor&select=id"
  private fun denied(work: () -> Unit) {
    var rejected = false
    try { work() } catch (_: SupplementalBlocked) { rejected = true }
    assertTrue("Expected scoped test-policy denial", rejected)
  }
  @Test fun exactNewScopeOnly() { assertTrue(bound().exactDelete("DELETE", delete(), true)) }
  @Test fun foreignPetPassesThrough() { assertFalse(bound().exactDelete("DELETE", delete(foreign), true)) }
  @Test fun foreignOwnerPassesThrough() { assertFalse(bound().exactDelete("DELETE", delete(actor = foreign), true)) }
  @Test fun wrongOriginPassesThrough() { assertFalse(bound().exactDelete("DELETE", delete().replace(origin, "https://other.invalid"), true)) }
  @Test fun wrongPathPassesThrough() { assertFalse(bound().exactDelete("DELETE", delete().replace("/pets?", "/records?"), true)) }
  @Test fun wrongMethodPassesThrough() { assertFalse(bound().exactDelete("POST", delete(), true)) }
  @Test fun unexpectedBodyPassesThrough() { assertFalse(bound().exactDelete("DELETE", delete(), false)) }
  @Test fun duplicatePredicatePassesThrough() { assertFalse(bound().exactDelete("DELETE", delete() + "&id=eq.$foreign", true)) }
  @Test fun extraPredicatePassesThrough() { assertFalse(bound().exactDelete("DELETE", delete() + "&or=(id.not.is.null)", true)) }
  @Test fun wildcardPassesThrough() { assertFalse(bound().exactDelete("DELETE", delete().replace("eq.$pet", "not.is.null"), true)) }
  @Test fun wrongMarkerDoesNotBind() {
    val g = SupplementalGuard(marker, origin); g.install(false)
    assertFalse(g.claimCreation("POST", create, "existing pet"))
    denied { g.created(create, owner, owner, pet, marker) }
  }
  @Test fun duplicateCreationRejectedBeforeAnotherSend() { denied { bound().claimCreation("POST", create, marker) } }
  @Test fun creationOwnerMismatchRejected() {
    val g = SupplementalGuard(marker, origin); g.install(false); g.claimCreation("POST", create, marker)
    denied { g.created(create, owner, foreign, pet, marker) }
  }
  @Test fun creationUnknownResultNeverBinds() { assertFalse(SupplementalGuard(marker, origin).exactDelete("DELETE", delete(), true)) }
  @Test fun malformedIdentityRejected() { denied { SupplementalBinding(marker, origin, "invalid", pet) } }
  @Test fun insecureOriginRejected() {
    assertTrue(SupplementalGuard.origin("http://fixture.invalid") == null)
    assertTrue(SupplementalGuard.origin("https://user@fixture.invalid") == null)
    assertTrue(SupplementalGuard.origin("https://fixture.invalid#fragment") == null)
  }
  @Test fun factoryLateRejected() { denied { SupplementalGuard(marker, origin).install(true) } }
  @Test fun creationCannotChooseItsOwnOrigin() {
    val g = SupplementalGuard(marker, origin); g.install(false)
    denied { g.claimCreation("POST", create.replace(origin, "https://other.invalid"), marker) }
  }
  @Test fun factoryDuplicateRejected() { val g = bound(); denied { g.install(false) } }
  @Test fun moduleCreationRequiresInstalledFactory() {
    val g = SupplementalGuard(marker, origin)
    denied { g.networkModuleCreated() }
    g.install(false); g.networkModuleCreated(); assertTrue(g.factoryObserved)
  }
  @Test fun markerMustFitExactRunFormat() { denied { SupplementalGuard("wrong marker", origin).install(false) } }
  @Test fun noHoldBeforeDurablePendingOrWhileActive() {
    denied { bound().claimHold(false, true) }; denied { bound().claimHold(true, false) }
  }
  @Test fun holdIsOneUse() {
    val g = bound(); g.session(session, pet); g.accepted(session, pet, "0", "27000", "PROGRESSION_INELIGIBLE_QUALITY", false)
    g.claimHold(true, true); denied { g.claimHold(true, true) }
  }
  @Test fun secondSessionAndForeignSessionRejected() {
    val g = bound(); g.session(session, pet)
    denied { g.session(foreign, pet) }; denied { g.session(session, foreign) }
  }
  @Test fun noClaimOrCanonicalCreditAllowed() {
    val g = bound(); g.session(session, pet)
    denied { g.accepted(session, pet, "1", "27000", "PROGRESSION_INELIGIBLE_QUALITY", false) }
    denied { g.accepted(session, pet, "0", "27000", "PROGRESSION_INELIGIBLE_QUALITY", true) }
    denied { g.accepted(session, pet, "0", "60000", "PROGRESSION_INELIGIBLE_QUALITY", false) }
    denied { g.accepted(session, pet, "0", "27000", "PROGRESSION_ELIGIBLE", false) }
  }
  @Test fun restoreCannotReplaceCapturedScope() {
    val g = bound(); denied { g.restore(SupplementalBinding(marker, origin, foreign, foreign)) }
  }
  @Test fun corruptAndUnknownJournalStatesRejected() {
    assertFalse(SupplementalGuard.validJournal(3, false, false, false, null))
    assertFalse(SupplementalGuard.validJournal(2, false, true, false, "FINAL"))
    assertFalse(SupplementalGuard.validJournal(2, true, false, false, "PENDING"))
    assertFalse(SupplementalGuard.validJournal(2, false, false, true, null))
    assertFalse(SupplementalGuard.validJournal(2, false, false, false, "UNKNOWN_STATE"))
    assertTrue(SupplementalGuard.validJournal(2, false, false, true, "PENDING"))
    assertTrue(SupplementalGuard.validJournal(2, true, true, true, "ACKNOWLEDGED"))
  }
}
