// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../token/CryptoAIToken.sol";
import "../compliance/BasicCompliance.sol";

/**
 * @title TokenFactory
 * @notice Factory contract for deploying CryptoAI security tokens
 * @dev Deploys new token instances with compliance modules
 */
contract TokenFactory is Ownable, ReentrancyGuard {
    // ==========================================
    // STRUCTS
    // ==========================================

    struct TokenConfig {
        string name;
        string symbol;
        uint8 decimals;
        uint256 maxSupply;
        address identityRegistry;
        address compliance;
        address owner;
    }

    struct DeployedToken {
        address tokenAddress;
        address complianceAddress;
        string name;
        string symbol;
        address deployer;
        uint256 deployedAt;
    }

    // ==========================================
    // STATE VARIABLES
    // ==========================================

    /// @notice Default identity registry
    address public defaultIdentityRegistry;

    /// @notice Deployed tokens
    DeployedToken[] public deployedTokens;

    /// @notice Token address to index mapping
    mapping(address => uint256) public tokenIndex;

    /// @notice Deployer to tokens mapping
    mapping(address => address[]) public deployerTokens;

    /// @notice Deployment fee (in wei)
    uint256 public deploymentFee;

    /// @notice Fee recipient
    address public feeRecipient;

    // ==========================================
    // EVENTS
    // ==========================================

    event TokenDeployed(
        address indexed tokenAddress,
        address indexed complianceAddress,
        string name,
        string symbol,
        address indexed deployer
    );

    event IdentityRegistryUpdated(address indexed newRegistry);
    event DeploymentFeeUpdated(uint256 newFee);
    event FeeRecipientUpdated(address indexed newRecipient);

    // ==========================================
    // ERRORS
    // ==========================================

    error InvalidAddress();
    error InsufficientFee(uint256 required, uint256 provided);
    error TransferFailed();

    // ==========================================
    // CONSTRUCTOR
    // ==========================================

    constructor(
        address defaultIdentityRegistry_,
        address feeRecipient_
    ) Ownable(msg.sender) {
        defaultIdentityRegistry = defaultIdentityRegistry_;
        feeRecipient = feeRecipient_ == address(0) ? msg.sender : feeRecipient_;
    }

    // ==========================================
    // DEPLOYMENT
    // ==========================================

    /**
     * @notice Deploy a new token with basic compliance
     * @param config Token configuration
     * @return tokenAddress The deployed token address
     * @return complianceAddress The deployed compliance address
     */
    function deployToken(
        TokenConfig calldata config
    ) external payable nonReentrant returns (
        address tokenAddress,
        address complianceAddress
    ) {
        // Check deployment fee
        if (msg.value < deploymentFee) {
            revert InsufficientFee(deploymentFee, msg.value);
        }

        // Use default identity registry if not specified
        address identityRegistry = config.identityRegistry != address(0)
            ? config.identityRegistry
            : defaultIdentityRegistry;

        // Deploy compliance if not specified
        if (config.compliance == address(0)) {
            BasicCompliance newCompliance = new BasicCompliance(identityRegistry);
            complianceAddress = address(newCompliance);

            // Transfer ownership of compliance to token owner
            newCompliance.transferOwnership(
                config.owner != address(0) ? config.owner : msg.sender
            );
        } else {
            complianceAddress = config.compliance;
        }

        // Deploy token
        CryptoAIToken token = new CryptoAIToken(
            config.name,
            config.symbol,
            config.decimals,
            config.maxSupply,
            identityRegistry,
            complianceAddress,
            config.owner != address(0) ? config.owner : msg.sender
        );

        tokenAddress = address(token);

        // Bind token to compliance
        if (config.compliance == address(0)) {
            BasicCompliance(complianceAddress).bindToken(tokenAddress);
        }

        // Record deployment
        uint256 index = deployedTokens.length;
        deployedTokens.push(DeployedToken({
            tokenAddress: tokenAddress,
            complianceAddress: complianceAddress,
            name: config.name,
            symbol: config.symbol,
            deployer: msg.sender,
            deployedAt: block.timestamp
        }));

        tokenIndex[tokenAddress] = index;
        deployerTokens[msg.sender].push(tokenAddress);

        // Transfer fee
        if (msg.value > 0 && feeRecipient != address(0)) {
            (bool success, ) = feeRecipient.call{value: msg.value}("");
            if (!success) revert TransferFailed();
        }

        emit TokenDeployed(
            tokenAddress,
            complianceAddress,
            config.name,
            config.symbol,
            msg.sender
        );
    }

    /**
     * @notice Deploy token with existing compliance
     * @param config Token configuration with compliance address set
     */
    function deployTokenWithCompliance(
        TokenConfig calldata config
    ) external payable nonReentrant returns (address tokenAddress) {
        if (config.compliance == address(0)) revert InvalidAddress();

        // Check deployment fee
        if (msg.value < deploymentFee) {
            revert InsufficientFee(deploymentFee, msg.value);
        }

        address identityRegistry = config.identityRegistry != address(0)
            ? config.identityRegistry
            : defaultIdentityRegistry;

        CryptoAIToken token = new CryptoAIToken(
            config.name,
            config.symbol,
            config.decimals,
            config.maxSupply,
            identityRegistry,
            config.compliance,
            config.owner != address(0) ? config.owner : msg.sender
        );

        tokenAddress = address(token);

        // Record deployment
        uint256 index = deployedTokens.length;
        deployedTokens.push(DeployedToken({
            tokenAddress: tokenAddress,
            complianceAddress: config.compliance,
            name: config.name,
            symbol: config.symbol,
            deployer: msg.sender,
            deployedAt: block.timestamp
        }));

        tokenIndex[tokenAddress] = index;
        deployerTokens[msg.sender].push(tokenAddress);

        // Transfer fee
        if (msg.value > 0 && feeRecipient != address(0)) {
            (bool success, ) = feeRecipient.call{value: msg.value}("");
            if (!success) revert TransferFailed();
        }

        emit TokenDeployed(
            tokenAddress,
            config.compliance,
            config.name,
            config.symbol,
            msg.sender
        );
    }

    // ==========================================
    // VIEW FUNCTIONS
    // ==========================================

    /**
     * @notice Get total deployed tokens count
     */
    function getDeployedTokensCount() external view returns (uint256) {
        return deployedTokens.length;
    }

    /**
     * @notice Get tokens deployed by an address
     * @param deployer Deployer address
     */
    function getTokensByDeployer(
        address deployer
    ) external view returns (address[] memory) {
        return deployerTokens[deployer];
    }

    /**
     * @notice Get deployed token info
     * @param token Token address
     */
    function getTokenInfo(
        address token
    ) external view returns (DeployedToken memory) {
        return deployedTokens[tokenIndex[token]];
    }

    /**
     * @notice Get deployed tokens with pagination
     * @param offset Start index
     * @param limit Number of tokens to return
     */
    function getDeployedTokens(
        uint256 offset,
        uint256 limit
    ) external view returns (DeployedToken[] memory) {
        uint256 total = deployedTokens.length;

        if (offset >= total) {
            return new DeployedToken[](0);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        DeployedToken[] memory result = new DeployedToken[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = deployedTokens[i];
        }

        return result;
    }

    // ==========================================
    // ADMIN FUNCTIONS
    // ==========================================

    /**
     * @notice Set default identity registry
     * @param registry New registry address
     */
    function setDefaultIdentityRegistry(address registry) external onlyOwner {
        defaultIdentityRegistry = registry;
        emit IdentityRegistryUpdated(registry);
    }

    /**
     * @notice Set deployment fee
     * @param fee New fee in wei
     */
    function setDeploymentFee(uint256 fee) external onlyOwner {
        deploymentFee = fee;
        emit DeploymentFeeUpdated(fee);
    }

    /**
     * @notice Set fee recipient
     * @param recipient New recipient address
     */
    function setFeeRecipient(address recipient) external onlyOwner {
        if (recipient == address(0)) revert InvalidAddress();
        feeRecipient = recipient;
        emit FeeRecipientUpdated(recipient);
    }

    /**
     * @notice Withdraw stuck ETH
     */
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = owner().call{value: balance}("");
            if (!success) revert TransferFailed();
        }
    }
}
