import { useCallback, useEffect, useMemo, useState } from "react";
import { ADDRESSES } from "../../addresses";
import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { MIST_PER_SUI } from "@mysten/sui/utils";

const Upgrade = ({
  nft,
  buildingType, // 0 for office, 1 for factory, 2 for house, 3 for entertainment_complex
  onUpgradeSuccess,
  onClick,
  onError,
  gameData, // Pass the gameData object containing cost_multiplier and other values
}: {
  nft: any;
  buildingType: number;
  onUpgradeSuccess: () => void;
  onClick: () => void;
  onError: () => void;
  gameData: any; // Add gameData as a prop
}) => {
  const [upgradeMessage, setUpgradeMessage] =
    useState<string>("Upgrade available");
  const [isProcessing, setIsProcessing] = useState(false);
  const account = useCurrentAccount();

  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showEffects: true,
          showBalanceChanges: true,
        },
      }),
  });

  // Memoize currentLevel to avoid recalculating on every render
  const currentLevel = useMemo(() => {
    if (!nft?.content?.fields) {
      console.warn("nft or nft fields are not available yet");
      return 0;
    }
    switch (buildingType) {
      case 0:
        return nft.content.fields.residental_office;
      case 1:
        return nft.content.fields.factory;
      case 2:
        return nft.content.fields.house;
      case 3:
        return nft.content.fields.entertainment_complex;
      default:
        console.log("Unknown building type");
        return 0;
    }
  }, [nft, buildingType]);

  // Memoized function to calculate the upgrade costs based on level and building type
  const getUpgradeCosts = useCallback(
    (level: number) => {
      const officeHouseCosts = [
        { sui: 1, sity: 0 },
        { sui: 0, sity: 240 },
        { sui: 5, sity: 0 },
        { sui: 0, sity: 1280 },
        { sui: 25, sity: 0 },
        { sui: 0, sity: 5120 },
        { sui: 100, sity: 0 },
        { sui: 0, sity: 0 },
      ];

      const factoryEntertainmentCosts = [
        { sui: 0, sity: 80 },
        { sui: 2.25, sity: 0 },
        { sui: 0, sity: 640 },
        { sui: 12, sity: 0 },
        { sui: 0, sity: 2560 },
        { sui: 50, sity: 0 },
        { sui: 0, sity: 10240 },
        { sui: 0, sity: 0 },
      ];

      const baseCosts =
        buildingType === 0 || buildingType === 2
          ? officeHouseCosts[level]
          : factoryEntertainmentCosts[level];

      const costMultiplier = gameData?.cost_multiplier || 100;
      return {
        sui: Math.round(baseCosts.sui * (costMultiplier / 100) * 100) / 100,
        sity: Math.round(baseCosts.sity * (costMultiplier / 100) * 100) / 100,
      };
    },
    [buildingType, gameData]
  );

  // Upgrade logic
  const upgrade = useCallback(async () => {
    try {
      setIsProcessing(true); // Set processing state
      setUpgradeMessage("Processing your upgrade...");

      if (!nft?.content?.fields) {
        console.error(
          "nft or nft fields are missing, cannot proceed with upgrade."
        );
        return;
      }

      const costs = getUpgradeCosts(currentLevel);
      const transactionBlock = new Transaction();

      transactionBlock.setSender(String(account?.address));

      // Handle SUI-based upgrades
      if (costs.sui > 0) {
        transactionBlock.moveCall({
          target: `${ADDRESSES.PACKAGE}::nft::upgrade_building_with_sui`,
          arguments: [
            transactionBlock.object(nft.objectId),
            transactionBlock.object(ADDRESSES.GAME),
            transactionBlock.object(String(buildingType)),
            coinWithBalance({ balance: costs.sui * Number(MIST_PER_SUI) }),
            transactionBlock.object(ADDRESSES.CLOCK),
          ],
        });

        signAndExecute(
          { transaction: transactionBlock },
          {
            onSuccess: () => {
              console.log("Upgrade successful with SUI");
              setUpgradeMessage("Upgrade successful! SUI used.");
              onUpgradeSuccess();
            },
            onError: (error) => {
              console.error("Upgrade error with SUI", error);
              setUpgradeMessage("Error: Unable to process SUI transaction.");
              onError();
            },
          }
        );
      }
      // Handle SITY-based upgrades
      else if (costs.sity > 0) {
        transactionBlock.setGasBudgetIfNotSet(50000000);

        transactionBlock.moveCall({
          target: `${ADDRESSES.PACKAGE}::nft::upgrade_building_with_sity`,
          arguments: [
            transactionBlock.object(nft.objectId),
            transactionBlock.object(ADDRESSES.GAME),
            transactionBlock.object(String(buildingType)),
            coinWithBalance({
              balance: costs.sity * 1000,
              type: `${ADDRESSES.TOKEN_TYPE}`,
            }),
            transactionBlock.object(ADDRESSES.CLOCK),
          ],
        });

        signAndExecute(
          { transaction: transactionBlock },
          {
            onSuccess: () => {
              console.log("Upgrade successful with SITY");
              setUpgradeMessage("Upgrade successful! SITY used.");
              onUpgradeSuccess();
            },
            onError: (error) => {
              console.error("Upgrade error with SITY", error);
              setUpgradeMessage("Error: Unable to process SITY transaction.");
              onError();
            },
          }
        );
      }
    } catch (error) {
      console.error("Upgrade Error:", error);
      setUpgradeMessage("Error occurred during the upgrade.");
      onError();
    } finally {
      setIsProcessing(false); // Reset processing state
    }
  }, [
    nft,
    buildingType,
    currentLevel,
    getUpgradeCosts,
    signAndExecute,
    onUpgradeSuccess,
    onError,
  ]);

  // Update the message with current upgrade costs on each change
  useEffect(() => {
    const costs = getUpgradeCosts(currentLevel);
    if (costs.sui > 0) {
      setUpgradeMessage(`Upgrade for ${costs.sui.toFixed(2)} SUI`);
    } else if (costs.sity > 0) {
      setUpgradeMessage(`Upgrade for ${costs.sity.toFixed(2)} SITY`);
    } else {
      setUpgradeMessage("No upgrades available");
    }
  }, [currentLevel, getUpgradeCosts]);

  return (
    <div className="flex flex-col gap-4">
      {currentLevel < 7 ? (
        <>
          <button
            className="mx-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            onClick={() => {
              onClick(); // Notify parent component to pause accumulation
              upgrade(); // Trigger the upgrade logic
            }}
            disabled={isProcessing || !nft?.content?.fields} // Disable button if processing or nft is not ready
          >
            {isProcessing ? "Processing..." : "Upgrade"}
          </button>
          <p>{upgradeMessage}</p>
        </>
      ) : (
        <p>Max level reached</p> // Message when the level is maxed out
      )}
    </div>
  );
};

export default Upgrade;
