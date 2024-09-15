import "../assets/styles/Game.css";
import { useEffect, useState, useRef, useCallback } from "react";
import Mint from "./Mint";
import Upgrade from "./Upgrade";
import Claim from "./Claim";
import ClaimFactoryBonus from "./ClaimFactoryBonus";
import { ADDRESSES } from "../../addresses";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { useCurrentWallet, useCurrentAccount } from "@mysten/dapp-kit";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import Modal from "./Modal"; // Import the new Modal component

// Define the IPFS link for the addresses
const ipfsLink =
  "https://bafkreigx3amq3lvgev5dy6p77drsxeylql3kxsyd43o3woifwaatm43gm4.ipfs.w3s.link/";

// Helper function to fetch addresses from IPFS
const fetchAddressesFromIpfs = async (): Promise<string[]> => {
  try {
    const response = await fetch(ipfsLink);

    if (!response.ok) {
      throw new Error("Failed to fetch addresses from IPFS");
    }

    const data = await response.text();
    const addresses = data
      .split("\n")
      .map((address: string) => address.trim())
      .filter(Boolean);

    return addresses;
  } catch (err) {
    console.error("Error fetching addresses:", err);
    return [];
  }
};

// Function to check if the user's address is in the IPFS list
const isAddressInList = async (userAddress: string): Promise<boolean> => {
  const addresses = await fetchAddressesFromIpfs();
  return addresses.includes(userAddress);
};
const Game: React.FC = () => {
  const { connectionStatus } = useCurrentWallet();
  const account = useCurrentAccount();

  const [filteredNft, setFilteredNft] = useState<any>(null); // Storing only a single filtered NFT
  const [accumulatedSity, setAccumulatedSity] = useState<number>(0);
  const [gameData, setGameData] = useState<any>(null);
  const [sityBalance, setSityBalance] = useState<number>(0);
  const [suiBalance, setSuiBalance] = useState<number>(0);
  const [isTransactionInProgress, setTransactionInProgress] = useState(false);
  const [transactionType, setTransactionType] = useState<string | null>(null); // Tracks current transaction type
  const [countdown, setCountdown] = useState<number | null>(null);
  const [factoryBonusCountdown, setFactoryBonusCountdown] = useState<
    number | null
  >(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Add loading state
  const [isAwaitingBlockchain, setIsAwaitingBlockchain] =
    useState<boolean>(false);
  const accumulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isUpgradeInfoExpanded, setIsUpgradeInfoExpanded] = useState(false); // Track whether upgrade info is expanded
  const [isMobileExpanded, setIsMobileExpanded] = useState(false); // Track whether building is expanded on mobile
  const [bgColor, setBgColor] = useState<0 | 1 | 2>(0); // Default to red (0)
  const [isUserEligible, setIsUserEligible] = useState<boolean>(false);
  const [passNft, setPassNft] = useState<boolean>(false);
  const [showEligibilityMessage, setShowEligibilityMessage] =
    useState<boolean>(true);
  const [currentBuildingIndex, setCurrentBuildingIndex] = useState<number>(0); // Track current building in the carousel
  const mintBackgroundUrl =
    "https://bafybeifzamdszfcbsrlmff7xqpdhjrjrp44u3iqzodm5r3bhg6aiycxjsu.ipfs.w3s.link/mint-2.webp";
  const buildings = [
    {
      type: "R. Office",
      field: "residental_office",
      imageBaseUrl:
        "https://bafybeicirp2yeyxcsta4y4ch4vqslapizvrowwi7enepqvq3s4gncpuwlm.ipfs.w3s.link/",
      buildingUrl:
        "https://bafybeicz5hchwhdfde2pjeo3tbndppqfa7npyyauwi4rjio3edutqok7w4.ipfs.w3s.link/",
    },
    {
      type: "Factory",
      field: "factory",
      imageBaseUrl:
        "https://bafybeih6ncjg3sqkm5jhot7m6brgmub255gdlys6l36lrur5bxgfenswx4.ipfs.w3s.link/",
      buildingUrl:
        "https://bafybeieb6jtila7flzlkybvl36wdrokz37v4nsjbw33itragrpdtl6o36a.ipfs.w3s.link/",
    },
    {
      type: "House",
      field: "house",
      imageBaseUrl:
        "https://bafybeiemoqvgqghpcikmbizqfsh6ujod4m5yuvv3k5lpz43333sjqki7oe.ipfs.w3s.link/",
      buildingUrl:
        "https://bafybeidwyrjf7ivqm76mg2wg3jbwtvo4sifuxkbrar3xzwn7xkugkbiqke.ipfs.w3s.link/",
    },
    {
      type: "E. Complex",
      field: "entertainment_complex",
      imageBaseUrl:
        "https://bafybeifussnaorucnonp6bfpfa3nlum5wvgi7wfrv5usd6h2ubbsv5yizm.ipfs.w3s.link/",
      buildingUrl:
        "https://bafybeibyvpq4sr33flefgewlxhvfyhgqdd5kcycaz2xortm6uqqrp6ahfa.ipfs.w3s.link/",
    },
  ];

  const [backgroundPosition, setBackgroundPosition] = useState({
    x: 50,
    y: 50,
  });
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const [isTouchDevice, setIsTouchDevice] = useState(false); // To detect if the device is touch-enabled
  const touchStartRef = useRef<{ x: number; y: number } | null>(null); // To store initial touch position

  useEffect(() => {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(isTouch);
  }, []);
  // Function to handle mouse movement
  const DAMPING_FACTOR = 0.005;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { width, height } = currentTarget.getBoundingClientRect();

    // Calculate the top 10% and bottom 20% of the element's height
    const topBoundary = height * 0.1;
    const bottomBoundary = height * 0.85;

    // Check if the mouse is within the active area (not within top 10% or bottom 20%)
    if (clientY < topBoundary || clientY > bottomBoundary) {
      return; // Do nothing if the mouse is outside the active area
    }

    const mouseXPercent = (clientX / width) * 100;
    const mouseYPercent = (clientY / height) * 100;

    // Reduce sensitivity by applying a damping factor
    setMousePosition((prevPos) => {
      const newX = prevPos.x + (mouseXPercent - prevPos.x) * DAMPING_FACTOR;
      const newY = prevPos.y + (mouseYPercent - prevPos.y) * DAMPING_FACTOR;

      return { x: newX, y: newY };
    });
  };

  // Function to handle touch start and store initial position
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent default touch behavior (scrolling)
    const { clientX, clientY } = e.touches[0];
    touchStartRef.current = { x: clientX, y: clientY };
  };

  // Function to handle touch movement
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent default touch behavior (scrolling)
    const { clientX, clientY } = e.touches[0];
    const { width, height } = e.currentTarget.getBoundingClientRect();

    if (!touchStartRef.current) return;

    const touchStartX = touchStartRef.current.x;
    const touchStartY = touchStartRef.current.y;

    const deltaX = clientX - touchStartX;
    const deltaY = clientY - touchStartY;

    const moveXPercent = (deltaX / width) * 100;
    const moveYPercent = (deltaY / height) * 100;

    setBackgroundPosition((prevPos) => {
      let newX = prevPos.x - moveXPercent;
      let newY = prevPos.y - moveYPercent;

      newX = Math.max(0, Math.min(newX, 100));
      newY = Math.max(0, Math.min(newY, 100));

      return { x: newX, y: newY };
    });

    touchStartRef.current = { x: clientX, y: clientY };
  };

  // Function to handle touch end (optional reset or cleanup)
  const handleTouchEnd = () => {
    touchStartRef.current = null; // Reset the reference when the touch ends
  };

  // Inside your Game component
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalMessage(null); // Clear message on close
  };

  const showModal = (message: string, bgColor: 0 | 1 | 2) => {
    setModalMessage(message);
    setIsModalOpen(true);

    // Automatically close the modal after 4 seconds
    setTimeout(() => {
      handleCloseModal();
    }, 2500);

    setBgColor(bgColor); // Set the background color based on the passed value
  };
  const currentBuilding = buildings[currentBuildingIndex];
  const provider = new SuiClient({
    url: getFullnodeUrl("testnet"),
  });
  const providerMainnet = new SuiClient({
    url: getFullnodeUrl("mainnet"),
  });

  const handleNextBuilding = () => {
    setCurrentBuildingIndex((prevIndex) => (prevIndex + 1) % buildings.length);
  };

  const handlePreviousBuilding = () => {
    setCurrentBuildingIndex((prevIndex) =>
      prevIndex === 0 ? buildings.length - 1 : prevIndex - 1
    );
  };

  // Helper to cancel any ongoing transaction
  const cancelCurrentTransaction = () => {
    if (transactionType) {
      console.log(`Cancelling ${transactionType} transaction...`);
      setTransactionType(null);
      setTransactionInProgress(false);
    }
  };

  // Helper to fetch balances
  const fetchBalances = useCallback(async () => {
    console.log("Fetching balances...");
    try {
      const [sityResponse, suiResponse] = await Promise.all([
        provider.getBalance({
          owner: String(account?.address),
          coinType: `${ADDRESSES.TOKEN_TYPE}`,
        }),
        provider.getBalance({ owner: String(account?.address) }),
      ]);

      console.log("SITY balance fetched:", sityResponse.totalBalance);
      console.log("SUI balance fetched:", suiResponse.totalBalance);

      setSityBalance(parseInt(sityResponse.totalBalance) / 1000);
      setSuiBalance(parseInt(suiResponse.totalBalance) / Number(MIST_PER_SUI));
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  }, [account?.address]);

  // Helper to fetch game data
  const fetchGameData = useCallback(async () => {
    console.log("Fetching game data...");
    try {
      const gameDataResponse = await provider.getObject({
        id: ADDRESSES.GAME,
        options: { showContent: true },
      });

      // Safely check for 'fields' in the content of the response
      const content = gameDataResponse?.data?.content;

      if (content && "fields" in content) {
        console.log("Game data fetched successfully:", content.fields);
        setGameData(content.fields); // This is safe now
      } else {
        console.warn("No fields found in the game data response.");
      }
    } catch (error) {
      console.error("Error fetching game data:", error);
    }
  }, []);

  const calculateCountdown = (nft: any) => {
    const houseLevel = nft.content.fields?.house || 0;
    const entertainmentComplexLevel =
      nft.content.fields?.entertainment_complex || 0;
    const maxTime = calculateMaxAccumulation(
      houseLevel,
      entertainmentComplexLevel
    );
    console.log("Max Accumulation:", maxTime);
    const currentTime = Date.now();
    const lastClaimedTimestamp = nft.content.fields?.last_claimed;
    const elapsedTime = currentTime - lastClaimedTimestamp;
    const remainingTime = maxTime - elapsedTime;

    return remainingTime > 0 ? remainingTime : 0;
  };

  const calculateFactoryBonusCountdown = (nft: any) => {
    const currentTime = Date.now();
    const lastDailyBonus = nft.content.fields?.last_daily_bonus;
    const elapsedTime = currentTime - lastDailyBonus;

    const bonusPeriod = (24 * 3600 * 1000) / gameData.speed; // 24 hours divided by game speed
    const remainingTime = bonusPeriod - elapsedTime;

    return remainingTime > 0 ? remainingTime : null;
  };

  const startCountdownInterval = (nft: any) => {
    console.log("Starting countdown interval...");
    if (countdownIntervalRef.current)
      clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      const newCountdown = calculateCountdown(nft);
      const newFactoryBonusCountdown = calculateFactoryBonusCountdown(nft);

      console.log("Updated countdown:", newCountdown);
      console.log("Updated factory bonus countdown:", newFactoryBonusCountdown);

      setCountdown(newCountdown);
      setFactoryBonusCountdown(newFactoryBonusCountdown);
    }, 1000); // Update every second
  };

  useEffect(() => {
    console.log("Checking if countdown and accumulation can start...");
    if (filteredNft && gameData && !isLoading && !isAwaitingBlockchain) {
      console.log("Starting accumulation and countdown...");
      const nft = filteredNft;
      startAccumulation(nft);
      startCountdownInterval(nft);

      return () => {
        if (accumulationIntervalRef.current)
          clearInterval(accumulationIntervalRef.current);
        if (countdownIntervalRef.current)
          clearInterval(countdownIntervalRef.current);
      };
    }
  }, [
    filteredNft,
    gameData,
    isLoading,
    isAwaitingBlockchain,
    isTransactionInProgress,
  ]);
  const handleUpgradeHover = () => {
    setTimeout(() => {
      setIsUpgradeInfoExpanded(true);
    }, 100);
  };

  const handleUpgradeLeave = () => {
    setIsUpgradeInfoExpanded(false);
  };

  const handleUpgradeClick = (buildingType: number) => {
    if (isTouchDevice) {
      // Check if the view is expanded
      if (!isMobileExpanded) {
        // First click: expand the building type div
        setIsMobileExpanded(true);
        setIsUpgradeInfoExpanded(true);
      } else {
        // Second click: initiate upgrade and collapse the view
        setIsMobileExpanded(false);
        setIsUpgradeInfoExpanded(false);
        setTransactionType("upgrade");
        setTransactionInProgress(true);
        console.log("UPGRADE CLICKED", buildingType);
        // Call upgrade function here
      }
    } else {
      // For non-mobile devices, just handle the upgrade click as usual
      setIsUpgradeInfoExpanded(false); // Collapse when clicked
      setTransactionType("upgrade");
      setTransactionInProgress(true);
      console.log("UPGRADE CLICKED", buildingType);
    }
  };

  const handleClaimClick = () => {
    cancelCurrentTransaction(); // Cancel ongoing transaction
    setTransactionType("claim");
    setTransactionInProgress(true);

    // Proceed with claim logic...
  };

  const handleUpgradeSuccess = () => {
    setTimeout(() => {
      console.log("UPGRADE SUCCESSFUL, awaiting new data...");
      setTransactionType(null);
      setIsAwaitingBlockchain(true);
      refreshNft();
      fetchBalances();
      setTransactionInProgress(false);
    }, 2000); // 2000 milliseconds = 2 seconds
  };

  const handleClaimSuccess = () => {
    setTimeout(() => {
      console.log("CLAIM SUCCESSFUL, awaiting new data...");
      refreshNft();
      setTransactionType(null);
      setIsAwaitingBlockchain(true);

      fetchBalances();
      setTransactionInProgress(false);
    }, 2000); // 2000 milliseconds = 2 seconds
    console.log("OUT");
  };

  const handleMintSuccess = () => {
    setTimeout(() => {
      console.log("MINT SUCCESSFUL, awaiting new data...");
      refreshNft();
      setTransactionType(null);
      setIsAwaitingBlockchain(true);
      fetchBalances();
      setTransactionInProgress(false);
    }, 2000); // 2000 milliseconds
  };

  // Helper to refresh NFTs
  const refreshNft = useCallback(async () => {
    console.log("Refreshing NFTs...");
    try {
      const allObjects: any[] = [];
      let lastObject = null;
      let hasMore = true;

      while (hasMore) {
        const object = await provider.getOwnedObjects({
          owner: String(account?.address),
          cursor:
            lastObject?.data?.[lastObject.data.length - 1]?.data?.objectId ||
            null,
          options: { showType: true, showContent: true },
        });

        allObjects.push(...object.data);

        if (object.data.length === 0 || !object.nextCursor) {
          hasMore = false;
        } else {
          lastObject = object;
        }
      }

      const nft = allObjects.find(
        (nft) => String(nft.data?.type) === `${ADDRESSES.NFT_TYPE}`
      );
      console.log("Filtered NFT found:", nft?.data);

      setFilteredNft(nft?.data || null);
      setIsLoading(false); // Mark loading as complete once NFT is fetched
      setIsAwaitingBlockchain(false); // Re-enable interaction and accumulation process
    } catch (error) {
      console.error("Error refreshing NFTs:", error);
      setIsLoading(false); // Stop loading if error occurs
      setIsAwaitingBlockchain(false); // Re-enable interaction and accumulation process
    }
  }, [account?.address]);

  // Re-fetch NFTs and balances when account changes
  useEffect(() => {
    if (account?.address) {
      console.log("Account changed, resetting state and fetching data...");
      setFilteredNft(null); // Reset NFT state
      setIsLoading(true); // Start loading when account changes
      refreshNft();
      fetchGameData();
      fetchBalances();
    }
  }, [account?.address, refreshNft, fetchGameData, fetchBalances]);

  const calculateAccumulatedSity = useCallback(
    (nft: any) => {
      if (!nft || !gameData) return 0;

      // Fetch relevant fields from the NFT data
      const lastAccumulatedTimestamp =
        nft.content.fields?.last_accumulated || 0;
      const lastClaimedTimestamp = nft.content.fields?.last_claimed || 0;
      const residentialOfficeLevel = nft.content.fields?.residental_office || 0;
      const houseLevel = nft.content.fields?.house || 0;
      const entertainmentComplexLevel =
        nft.content.fields?.entertainment_complex || 0;

      // Get current time and calculate time elapsed
      const currentTime = Date.now();
      const elapsedTime = currentTime - lastAccumulatedTimestamp;
      const elapsedTimeFromClaim = currentTime - lastClaimedTimestamp;

      // Calculate the maximum accumulation period based on house and entertainment levels
      const maxAccumulationPeriod = calculateMaxAccumulation(
        houseLevel,
        entertainmentComplexLevel
      );

      console.log("Max accumulation period:", maxAccumulationPeriod);

      // Calculate the effective elapsed time by limiting to the max accumulation period
      let effectiveElapsedTime;

      if (elapsedTimeFromClaim <= maxAccumulationPeriod) {
        effectiveElapsedTime = elapsedTime;
      } else {
        effectiveElapsedTime =
          maxAccumulationPeriod -
          (lastAccumulatedTimestamp - lastClaimedTimestamp);
      }

      console.log("Effective elapsed time:", effectiveElapsedTime);

      // If no effective time has passed, return 0
      if (effectiveElapsedTime <= 0) return 0;

      // Fetch the accumulation speed based on the residential office level
      const accumulationPerHour =
        gameData.accumulation_speeds[residentialOfficeLevel];

      // Calculate the accumulated SITY based on effective elapsed time (in hours)
      const accumulatedSityMs =
        effectiveElapsedTime * accumulationPerHour * gameData.speed;

      const accumulatedSity = accumulatedSityMs / 3600000;

      // Log and return accumulated SITY (adjust division by 100 as needed)
      console.log("Accumulated SITY:", accumulatedSity);
      return accumulatedSity / 1000;
    },
    [gameData]
  );

  // Function to calculate the maximum accumulation period
  const calculateMaxAccumulation = useCallback(
    (houseLevel: number, entertainmentLevel: number): number => {
      const totalLevel =
        parseInt(houseLevel.toString()) +
        parseInt(entertainmentLevel.toString());
      // Base accumulation period is 3 hours
      if (totalLevel === 0) {
        return (3 * 3600 * 1000) / gameData.speed;
      } else if (totalLevel <= 7) {
        return ((3 + totalLevel) * 3600 * 1000) / gameData.speed;
      }

      // Adds 2 hours per level after level 7
      return ((10 + 2 * (totalLevel - 7)) * 3600 * 1000) / gameData.speed;
    },
    [gameData]
  );

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const startAccumulation = (nft: any) => {
    if (!nft || isTransactionInProgress) return;

    console.log("Starting accumulation...");

    // Clear the previous accumulation interval if it exists
    if (accumulationIntervalRef.current)
      clearInterval(accumulationIntervalRef.current);

    // Start a new accumulation interval
    accumulationIntervalRef.current = setInterval(() => {
      const newlyAccumulatedSity = calculateAccumulatedSity(nft);
      console.log("Updated accumulated SITY:", newlyAccumulatedSity);
      setAccumulatedSity(newlyAccumulatedSity);
    }, 100); // Update every second
  };

  useEffect(() => {
    console.log("blochhain wait status:: ", isAwaitingBlockchain);
    console.log("loading  status:: ", isLoading);
  }, [isAwaitingBlockchain, isLoading]);

  useEffect(() => {
    refreshNft();
    fetchGameData();
  }, [account]);

  const formatBalance = (balance: number) => {
    if (balance >= 1000) {
      return (balance / 1000).toFixed(2) + "k";
    }
    return balance.toFixed(2);
  };

  // Function to calculate population based on building levels
  const calculatePopulation = (nft: any) => {
    const basePopulation = 10000;

    const calculateForBuilding = (level: number) => {
      let population = basePopulation;
      for (let i = 0; i < level; i++) {
        population = Math.floor((population * 14) / 10); // Multiply by 1.4
      }
      return population;
    };

    const residentialOfficePopulation = calculateForBuilding(
      nft.content.fields.residental_office
    );
    const housePopulation = calculateForBuilding(nft.content.fields.house);
    const factoryPopulation = calculateForBuilding(nft.content.fields.factory);
    const entertainmentPopulation = calculateForBuilding(
      nft.content.fields.entertainment_complex
    );

    return (
      residentialOfficePopulation +
      housePopulation +
      factoryPopulation +
      entertainmentPopulation
    );
  };

  // Function to refresh Passes (check if user owns the specific pass)
  const refreshPass = useCallback(async () => {
    console.log("Refreshing Passes...");
    try {
      const allObjects: any[] = [];
      let lastObject = null;
      let hasMore = true;

      while (hasMore) {
        const object = await providerMainnet.getOwnedObjects({
          owner: String(account?.address),
          cursor:
            lastObject?.data?.[lastObject.data.length - 1]?.data?.objectId ||
            null,
          options: { showType: true, showContent: true },
        });

        allObjects.push(...object.data);

        if (object.data.length === 0 || !object.nextCursor) {
          hasMore = false;
        } else {
          lastObject = object;
        }
      }

      const nft = allObjects.find(
        (nft) =>
          String(nft.data?.type) ===
            `0x4cb43a298a78ab64a3181305e45cef6b4ecadf35e85c92496aa1590c11af5c70::nft::NFTMetadata` &&
          nft.data?.content?.fields?.name === "TESTGAMEPASS"
      );

      console.log("PASS NFT found:", nft?.data);
      if ((nft?.data).size > 0) {
        setPassNft(true); // Set the Pass NFT state to true if found
      }
      return !!nft; // Return true if the Pass NFT is found
    } catch (error) {
      console.error("Error refreshing Passes:", error);
      setPassNft(false); // Set the Pass NFT state to false in case of error
      return false; // Return false in case of error
    }
  }, [account?.address]);

  // Function to check eligibility (address in IPFS list + Pass NFT ownership)
  const checkEligibility = useCallback(async () => {
    if (account?.address) {
      const isAddressEligible = await isAddressInList(account.address);
      const hasPassNft = await refreshPass();

      // User is eligible if their address is in the IPFS list and they own the Pass NFT
      setIsUserEligible(isAddressEligible || hasPassNft);
      setIsLoading(false); // Stop loading once eligibility is checked
      setShowEligibilityMessage(true); // Show eligibility message
      console.log("User eligibility:", isAddressEligible || hasPassNft);

      // Hide eligibility message after 3 seconds
      setTimeout(() => {
        setShowEligibilityMessage(false);
      }, 2000);
    }
  }, [account?.address, refreshPass]);

  // useEffect to reset eligibility message when account changes
  useEffect(() => {
    setShowEligibilityMessage(true);
    setIsLoading(true); // Reset loading when account changes
  }, [account?.address]);

  useEffect(() => {
    if (!filteredNft && account?.address) {
      // If user hasn't minted an NFT, check eligibility
      checkEligibility();
    }
  }, [account?.address, filteredNft, checkEligibility]);

  // Render loading state if eligibility is still being checked
  if (isLoading) {
    return (
      <p
        style={{
          position: "absolute",
          top: "10%",
          left: "50%",
          transform: "translate(-50%,-50%)",
        }}
      >
        Checking eligibility...
      </p>
    );
  }

  return (
    <div
      className="game-container"
      onMouseMove={isTouchDevice ? undefined : handleMouseMove}
      onTouchStart={isTouchDevice ? handleTouchStart : undefined}
      onTouchMove={isTouchDevice ? handleTouchMove : undefined}
      onTouchEnd={isTouchDevice ? handleTouchEnd : undefined}
      style={{
        backgroundImage:
          connectionStatus === "connected" && filteredNft?.content?.fields
            ? // Apply the background for NFT-loaded state
              `url(${currentBuilding.imageBaseUrl}/${
                filteredNft.content.fields[currentBuilding.field]
              }.webp)`
            : `url(${mintBackgroundUrl})`, // Use the minting background when filteredNft is null
        backgroundPosition:
          connectionStatus === "connected" && filteredNft?.content?.fields
            ? isTouchDevice
              ? `${backgroundPosition.x}% ${backgroundPosition.y}%`
              : `${mousePosition.x}% ${mousePosition.y}%`
            : "50% 25%", // Fixed position in case of minting
        backgroundSize:
          connectionStatus === "connected" && filteredNft?.content?.fields
            ? "cover" // Full coverage when NFT is loaded
            : "cover", // Fixed size for minting background
        backgroundColor:
          connectionStatus !== "connected" || isLoading || filteredNft === null
            ? "white"
            : "transparent",
        transition: "filter 0.3s ease-in-out", // Smooth transition for blur
      }}
    >
      <Modal
        show={isModalOpen}
        message={modalMessage || ""}
        onClose={handleCloseModal}
        bgColor={bgColor} // Pass the bgColor prop
      />
      {/* Check if the wallet is connected */}
      {connectionStatus === "connected" ? (
        <>
          {/* Check if the user is eligible */}
          {isUserEligible || passNft ? (
            <>
              {/* Display Eligibility Messages */}
              {!filteredNft && showEligibilityMessage && (
                <div className="eligibility-status">
                  <p>Eligibility Result: {isUserEligible ? "✅" : "🚫"}</p>
                </div>
              )}
              {/* Loading NFTs and Game Data */}
              {isLoading ? (
                <p>Loading your NFTs and game data...</p>
              ) : filteredNft ? (
                <>
                  <div className="upper-div">
                    {/* Connect Button and Connected Status */}
                    {connectionStatus === "connected" ? (
                      <>
                        <div className="balance-columns">
                          <div className="balance-bar">
                            <img
                              src="https://assets.staticimg.com/cms/media/8uGGQmvkfODw7cnx3GuekBb404A2bTYUcTjBklHja.png"
                              alt="SUI logo"
                              className="balance-bar-icon"
                            />
                            <div className="balance-bar-track">
                              <div
                                className="balance-bar-fill balance-bar-fill-sui"
                                style={{ width: `${suiBalance * 10}%` }}
                              ></div>
                              <div className="balance-amount">{`${formatBalance(
                                suiBalance
                              )}  $SUI`}</div>
                            </div>
                          </div>
                          <div className="balance-bar">
                            <img
                              src="https://bafybeig4236djyafwvxzkb3km7o3xa25lsfg55bxvyrwbxyemlzjnjjpsi.ipfs.w3s.link/sity%20logo.png"
                              alt="SITY logo"
                              className="balance-bar-icon"
                            />
                            <div className="balance-bar-track">
                              <div
                                className="balance-bar-fill balance-bar-fill-sity"
                                style={{ width: `${sityBalance / 1000}%` }}
                              ></div>
                              <div className="balance-amount">{`${formatBalance(
                                sityBalance
                              )}  $SITY`}</div>
                            </div>
                          </div>
                        </div>

                        <div className="nft-title">
                          {filteredNft ? (
                            <h2>{filteredNft.content.fields.name}</h2>
                          ) : null}
                        </div>

                        {/* New NFT Specs Tab */}
                        <div className="nft-specs">
                          <p>Accumulation Speed: </p>
                          <h2>
                            <img
                              src="https://bafybeiahevtcpw4pxgklnglmoayfoer3asgha6ajk3pxbu35g4npwb54ey.ipfs.w3s.link/acc1.webp"
                              alt="acc-icon"
                              className="acc-icon"
                              style={{
                                width: "30px",
                                height: "30px",
                                marginRight: "3px",
                              }}
                            />
                            {`${
                              gameData.accumulation_speeds[
                                filteredNft.content.fields.residental_office
                              ] / 1000
                            } $SITY/h`}
                          </h2>

                          <p> Factory Bonus:</p>
                          <h2>
                            <img
                              src="https://bafybeiahevtcpw4pxgklnglmoayfoer3asgha6ajk3pxbu35g4npwb54ey.ipfs.w3s.link/gear1.webp"
                              alt="gear-icon"
                              className="gear-icon"
                              style={{
                                width: "30px",
                                height: "30px",
                                marginRight: "5px",
                              }}
                            />
                            {`${
                              gameData.factory_bonuses[
                                filteredNft.content.fields.factory
                              ]
                            }%`}
                          </h2>

                          <p>Amenity Points:</p>
                          <h2>
                            <img
                              src="https://bafybeiahevtcpw4pxgklnglmoayfoer3asgha6ajk3pxbu35g4npwb54ey.ipfs.w3s.link/star1.webp"
                              alt="star-icon"
                              className="star-icon"
                              style={{
                                width: "30px",
                                height: "30px",
                                marginRight: "5px",
                              }}
                            />
                            {`${
                              parseInt(filteredNft.content.fields.house) +
                              parseInt(
                                filteredNft.content.fields.entertainment_complex
                              )
                            }`}
                          </h2>
                        </div>
                      </>
                    ) : (
                      <></>
                    )}
                  </div>

                  {/* Left Arrow */}
                  <button
                    onClick={handlePreviousBuilding}
                    className="arrow-left"
                  >
                    &#8592;
                  </button>

                  {/* Building Display */}
                  <div
                    className={`buildingType ${
                      isTouchDevice
                        ? isMobileExpanded &&
                          filteredNft.content.fields[currentBuilding.field] < 7
                          ? "expanded"
                          : "collapsed"
                        : isUpgradeInfoExpanded &&
                          filteredNft.content.fields[currentBuilding.field] < 7
                        ? "expanded"
                        : "collapsed"
                    }`}
                    onMouseEnter={
                      !isTouchDevice &&
                      filteredNft.content.fields[currentBuilding.field] < 7
                        ? handleUpgradeHover
                        : undefined
                    }
                    onMouseLeave={
                      !isTouchDevice &&
                      filteredNft.content.fields[currentBuilding.field] < 7
                        ? handleUpgradeLeave
                        : undefined
                    }
                    onClick={() => {
                      if (
                        isTouchDevice &&
                        filteredNft.content.fields[currentBuilding.field] < 7
                      ) {
                        handleUpgradeClick(currentBuildingIndex); // Handle the click for mobile devices
                      }
                    }}
                  >
                    <h2>{`${currentBuilding.type} Level: ${
                      filteredNft.content.fields[currentBuilding.field]
                    }`}</h2>

                    {isUpgradeInfoExpanded && (
                      <div className="additional-info">
                        <p style={{ fontSize: "12px" }}>
                          Upgrading will not only improve your building’s
                          functionality but will also change the metadata,
                          appearance, and rarity of your NFT, thanks to the
                          power of dynamic NFTs.
                        </p>
                        {/* Building Images */}
                        <div className="building-images">
                          <div className="building-image">
                            <img
                              src={`${currentBuilding.buildingUrl}/${
                                filteredNft.content.fields[
                                  currentBuilding.field
                                ]
                              }.webp`}
                              alt="Current Level"
                              className="building-image-zoom"
                            />
                            <p className="level-text current-level">{`Level ${
                              filteredNft.content.fields[currentBuilding.field]
                            }`}</p>
                          </div>

                          {/* Arrow Between Images */}
                          <div className="level-arrow">
                            <p>➔</p>
                          </div>

                          <div className="building-image">
                            <img
                              src={`${currentBuilding.buildingUrl}/${
                                parseInt(
                                  filteredNft.content.fields[
                                    currentBuilding.field
                                  ]
                                ) + 1
                              }.webp`}
                              alt="Next Level"
                              className="building-image-zoom"
                            />
                            <p className="level-text next-level">{`Level ${
                              parseInt(
                                filteredNft.content.fields[
                                  currentBuilding.field
                                ]
                              ) + 1
                            }`}</p>
                          </div>
                        </div>

                        {/* Upgrade Benefit Text */}
                        <div className="upgrade-benefit">
                          {currentBuilding.type === "R. Office" && (
                            <>
                              <p style={{ color: "gray", fontSize: "14px" }}>
                                Accumulation Speed:
                              </p>
                              <p
                                className="benefit-value"
                                style={{ color: "gray", fontSize: "16px" }}
                              >
                                {`${
                                  gameData.accumulation_speeds[
                                    filteredNft.content.fields[
                                      currentBuilding.field
                                    ]
                                  ] / 1000
                                } $SITY/hour`}
                              </p>

                              <p
                                style={{
                                  color: "green",
                                  fontSize: "18px",
                                  marginTop: "10px",
                                }}
                              >
                                Accumulation Speed (Next Level):
                              </p>
                              <p
                                className="benefit-value next-level"
                                style={{
                                  color: "green",
                                  fontSize: "20px",
                                  fontWeight: "bold",
                                }}
                              >
                                {`${
                                  gameData.accumulation_speeds[
                                    parseInt(
                                      filteredNft.content.fields[
                                        currentBuilding.field
                                      ]
                                    ) + 1
                                  ] / 1000
                                } $SITY/hour`}
                              </p>
                            </>
                          )}

                          {currentBuilding.type === "Factory" && (
                            <>
                              <p style={{ color: "gray", fontSize: "14px" }}>
                                Factory Bonus:
                              </p>
                              <p
                                className="benefit-value"
                                style={{ color: "gray", fontSize: "16px" }}
                              >
                                {`${
                                  gameData.factory_bonuses[
                                    filteredNft.content.fields[
                                      currentBuilding.field
                                    ]
                                  ]
                                }%`}
                              </p>

                              <p
                                style={{
                                  color: "green",
                                  fontSize: "18px",
                                  marginTop: "10px",
                                }}
                              >
                                Factory Bonus (Next Level):
                              </p>
                              <p
                                className="benefit-value next-level"
                                style={{
                                  color: "green",
                                  fontSize: "20px",
                                  fontWeight: "bold",
                                }}
                              >
                                {`${
                                  gameData.factory_bonuses[
                                    parseInt(
                                      filteredNft.content.fields[
                                        currentBuilding.field
                                      ]
                                    ) + 1
                                  ]
                                }%`}
                              </p>
                            </>
                          )}

                          {(currentBuilding.type === "House" ||
                            currentBuilding.type === "E. Complex") && (
                            <>
                              <p style={{ color: "gray", fontSize: "14px" }}>
                                Amenity Points:
                              </p>
                              <p
                                className="benefit-value"
                                style={{ color: "gray", fontSize: "16px" }}
                              >
                                {
                                  filteredNft.content.fields[
                                    currentBuilding.field
                                  ]
                                }
                              </p>

                              <p
                                style={{
                                  color: "green",
                                  fontSize: "18px",
                                  marginTop: "10px",
                                }}
                              >
                                Amenity Points (Next Level):
                              </p>
                              <p
                                className="benefit-value next-level"
                                style={{
                                  color: "green",
                                  fontSize: "20px",
                                  fontWeight: "bold",
                                }}
                              >
                                {parseInt(
                                  filteredNft.content.fields[
                                    currentBuilding.field
                                  ]
                                ) + 1}
                              </p>
                            </>
                          )}
                          <a
                            target="_blank"
                            className="details"
                            href="https://docs.suicityp2e.com/"
                          >
                            more details
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Use ClaimFactoryBonus and Upgrade components instead of the button */}
                    {currentBuilding.type === "Factory" ? (
                      <>
                        <div>
                          {factoryBonusCountdown !== null &&
                          factoryBonusCountdown > 0 ? (
                            <p>{`${formatTime(factoryBonusCountdown)}`}</p>
                          ) : (
                            <ClaimFactoryBonus
                              nft={filteredNft}
                              onClaimSuccess={handleClaimSuccess}
                              onClick={() => handleClaimClick()}
                              onError={() => {
                                setTransactionInProgress(false);
                                refreshNft();
                              }}
                              showModal={showModal} // Pass showModal as a prop here
                            />
                          )}
                        </div>
                      </>
                    ) : null}

                    <Upgrade
                      nft={filteredNft}
                      buildingType={currentBuildingIndex}
                      onUpgradeSuccess={() => handleUpgradeSuccess()} // Pass the building type and NFT
                      onClick={() => handleUpgradeClick(currentBuildingIndex)}
                      onError={() => {
                        setTransactionInProgress(false);
                        refreshNft();
                      }}
                      gameData={gameData}
                      showModal={showModal} // Pass showModal as a prop here
                      isTouchDevice={isTouchDevice} // Pass isTouchDevice to Upgrade
                    />
                  </div>

                  <div className="accumulated">
                    <h2>
                      <img
                        src="https://bafybeiahevtcpw4pxgklnglmoayfoer3asgha6ajk3pxbu35g4npwb54ey.ipfs.w3s.link/coins1.webp"
                        alt="coin-icon"
                        className="coin-icon"
                        style={{
                          width: "30px",
                          height: "30px",
                          marginRight: "5px",
                          borderRadius: "50%",
                          transform: "translateY(5px)",
                        }}
                      />
                      {`${(
                        accumulatedSity +
                        filteredNft.content.fields.balance / 1000
                      ).toFixed(2)} $SITY`}
                    </h2>
                    <p>{`${countdown ? formatTime(countdown) : "Full"}`}</p>
                    <Claim
                      nft={filteredNft}
                      onClaimSuccess={handleClaimSuccess}
                      onClick={() => handleClaimClick()}
                      onError={() => {
                        setTransactionInProgress(false);
                        refreshNft();
                      }}
                      showModal={showModal} // Pass showModal as a prop here
                    />
                  </div>

                  <div className="population">
                    <h2>
                      <img
                        src="https://bafybeiahevtcpw4pxgklnglmoayfoer3asgha6ajk3pxbu35g4npwb54ey.ipfs.w3s.link/peop1.webp"
                        alt="people-icon"
                        className="people-icon"
                        style={{
                          width: "30px",
                          height: "30px",
                          marginRight: "5px",
                          transform: "translateY(5px)",
                        }}
                      />
                      {`Population: ${formatBalance(
                        calculatePopulation(filteredNft) +
                          accumulatedSity +
                          filteredNft.content.fields.balance / 1000
                      )}`}
                    </h2>

                    <button
                      onClick={() => {
                        const population = calculatePopulation(filteredNft);
                        const sity = (
                          accumulatedSity +
                          filteredNft.content.fields.balance / 1000
                        ).toFixed(2);
                        const tweetText = `I just reached a population of ${formatBalance(
                          population + parseInt(sity)
                        )} on SuiCity with ${formatBalance(
                          Number(sityBalance) + parseInt(sity)
                        )} $SITY! 🚀 Check out the game now! @SuiCityP2E`;
                        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                          tweetText
                        )}&url=https://suicityp2e.com`;

                        window.open(twitterUrl, "_blank");
                      }}
                    >
                      Share it on Twitter
                    </button>
                  </div>

                  {/* Right Arrow */}
                  <button onClick={handleNextBuilding} className="arrow-right">
                    &#8594;
                  </button>
                </>
              ) : (
                <div className="mint">
                  <Mint
                    onMintSuccessful={handleMintSuccess}
                    showModal={showModal} // Pass showModal as a prop here
                  />
                </div>
              )}
            </>
          ) : (
            <p className="eligibility-status">
              You are not eligible for test game.
            </p>
          )}
        </>
      ) : (
        <div className="pleaseConnect">
          <h2>Please connect your wallet</h2>
        </div>
      )}
    </div>
  );
};

export default Game;
