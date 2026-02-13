# Native Rollout and Rollback Plan

This plan defines staged rollout sequencing and rollback triggers for Apple and Android releases.

## Staged Rollout
1. Internal QA build verification:
   - Apple: TestFlight internal testers
   - Android: Play Console internal testing track
2. Limited external rollout:
   - Apple: phased release start (small cohort)
   - Android: production rollout at 10%
3. Broader rollout:
   - increase to 25%, then 50%, then 100% after stability checks

## Stability Gates per Stage
- Crash-free sessions at or above target SLO.
- No new high-severity security/privacy issues.
- No blocking regressions in upload/decrypt/history/sync core flows.

## Rollback Triggers
- Crash spike over release baseline threshold.
- Data loss or corruption bug in history/sync flows.
- Security issue exposing sensitive material.
- Platform policy rejection that blocks production rollout.

## Rollback Actions
1. Halt further rollout expansion.
2. Promote previous known-good version:
   - Apple: stop phased release and submit hotfix if needed.
   - Android: deactivate latest production rollout and increase prior version availability.
3. Publish incident summary and remediation owner/date.
