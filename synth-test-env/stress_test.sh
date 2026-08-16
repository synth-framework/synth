#!/bin/bash
set -e
echo "Starting Stress Test in $(pwd)"

echo "\n--- 1. Alignment Prepare ---"
time node ../dist/cli/synth.js alignment prepare --purpose "Stress Testing" > align.json
CONTRACT_ID=$(jq -r '.contractId' align.json)
echo "Contract ID: $CONTRACT_ID"

echo "\n--- 2. Mission Create ---"
time node ../dist/cli/synth.js mission create --subject "Stress Test Mission" --purpose "To stress test the system" > create_mission.json
DRAFT_ID=$(jq -r '.draftId' create_mission.json)
echo "Draft ID: $DRAFT_ID"

echo "\n--- 3. Mission Evidence Add ---"
time node ../dist/cli/synth.js mission evidence add --draft-id $DRAFT_ID --subject "Stress Evidence" --purpose "Push confidence" --confidence certain > evidence1.json
DRAFT_ID=$(jq -r '.draftId' evidence1.json)
echo "New Draft ID: $DRAFT_ID"

echo "\n--- 4. Mission Approve ---"
time node ../dist/cli/synth.js mission approve --draft-id $DRAFT_ID --alignment-contract-id $CONTRACT_ID > approve.json
MISSION_ID=$(jq -r '.runtime.missionId' approve.json)
echo "Approved Mission ID: $MISSION_ID"

echo "\n--- 5. Expedition Create (x5) ---"
for i in {1..5}; do
  time node ../dist/cli/synth.js expedition create --mission $MISSION_ID --subject "Expedition $i" --goal "Goal $i" > exp_$i.json
  EXP_DRAFT_ID=$(jq -r '.draftId' exp_$i.json)
  echo "Expedition $i Draft ID: $EXP_DRAFT_ID"
done

echo "\n--- 6. Explain Replay ---"
time node ../dist/cli/synth.js explain replay > replay.json
echo "Replay Check Completed"
