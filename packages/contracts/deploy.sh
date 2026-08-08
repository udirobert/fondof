#!/bin/bash
# Deploy SkillPool to Monad Testnet
# Usage: ./deploy.sh
#
# Required env vars (loaded from ../../.env):
#   FONDOF_RELAYER_KEY - deployer private key
#   FONDOF_RELAYER_ADDRESS - resolver address (same as deployer for Blitz)

set -e

# Load env
if [ -f "../../.env" ]; then
  export $(grep -v '^#' ../../.env | xargs)
fi

DEPLOYER_KEY="${FONDOF_RELAYER_KEY}"
RESOLVER="${FONDOF_RELAYER_ADDRESS}"
RPC="${MONAD_RPC_URL:-https://testnet-rpc.monad.xyz}"

if [ -z "$DEPLOYER_KEY" ]; then
  echo "Error: FONDOF_RELAYER_KEY not set"
  exit 1
fi

if [ -z "$RESOLVER" ]; then
  echo "Error: FONDOF_RELAYER_ADDRESS not set"
  exit 1
fi

echo "Deploying SkillPool to Monad Testnet..."
echo "  RPC: $RPC"
echo "  Resolver: $RESOLVER"
echo ""

# Use foundry forge (adjust path if needed)
FORGE="${HOME}/.foundry/bin/forge"

$FORGE script script/Deploy.s.sol \
  --rpc-url "$RPC" \
  --broadcast \
  --private-key "$DEPLOYER_KEY" \
  -vvv

echo ""
echo "Done! Copy the deployed contract address into .env as FONDOF_CONTRACT_ADDRESS"
