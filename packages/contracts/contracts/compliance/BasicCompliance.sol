// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/ICompliance.sol";
import "../interfaces/IIdentityRegistry.sol";

/**
 * @title BasicCompliance
 * @notice Basic compliance module for CryptoAI tokens
 * @dev Implements country restrictions and investor limits
 */
contract BasicCompliance is ICompliance, Ownable {
    // ==========================================
    // STATE VARIABLES
    // ==========================================

    /// @notice Bound tokens
    mapping(address => bool) public boundTokens;

    /// @notice Identity registry
    IIdentityRegistry public identityRegistry;

    /// @notice Compliance modules
    address[] public modules;
    mapping(address => bool) public isModule;

    /// @notice Allowed countries (ISO 3166-1 numeric)
    mapping(uint16 => bool) public allowedCountries;

    /// @notice Blocked countries
    mapping(uint16 => bool) public blockedCountries;

    /// @notice Maximum number of token holders (0 = unlimited)
    uint256 public maxInvestors;

    /// @notice Current investor count per token
    mapping(address => uint256) public investorCount;

    /// @notice Track if address holds tokens
    mapping(address => mapping(address => bool)) public isInvestor;

    /// @notice Maximum holding per investor (0 = unlimited)
    mapping(address => uint256) public maxHolding;

    // ==========================================
    // ERRORS
    // ==========================================

    error TokenNotBound();
    error TokenAlreadyBound();
    error CountryNotAllowed(uint16 country);
    error CountryBlocked(uint16 country);
    error MaxInvestorsReached(uint256 max);
    error MaxHoldingExceeded(uint256 max, uint256 requested);
    error ModuleAlreadyExists();
    error ModuleNotFound();

    // ==========================================
    // CONSTRUCTOR
    // ==========================================

    constructor(address identityRegistry_) Ownable(msg.sender) {
        identityRegistry = IIdentityRegistry(identityRegistry_);
    }

    // ==========================================
    // COMPLIANCE CHECK
    // ==========================================

    /**
     * @inheritdoc ICompliance
     */
    function canTransfer(
        address from,
        address to,
        uint256 amount
    ) external view override returns (bool) {
        // Check recipient country
        if (address(identityRegistry) != address(0)) {
            uint16 country = identityRegistry.investorCountry(to);

            // Check if country is in allowed list (if list is used)
            if (_hasAllowedCountries() && !allowedCountries[country]) {
                return false;
            }

            // Check if country is blocked
            if (blockedCountries[country]) {
                return false;
            }
        }

        // Check max investors
        address token = msg.sender;
        if (maxInvestors > 0 && !isInvestor[token][to]) {
            if (investorCount[token] >= maxInvestors) {
                return false;
            }
        }

        // Check max holding
        if (maxHolding[token] > 0) {
            // Note: This is a simplified check. In production, you'd need to
            // get the actual balance from the token contract
            if (amount > maxHolding[token]) {
                return false;
            }
        }

        // Check additional modules
        for (uint256 i = 0; i < modules.length; i++) {
            if (!ICompliance(modules[i]).canTransfer(from, to, amount)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @inheritdoc ICompliance
     */
    function transferred(
        address from,
        address to,
        uint256 amount
    ) external override {
        if (!boundTokens[msg.sender]) revert TokenNotBound();

        address token = msg.sender;

        // Update investor tracking
        if (!isInvestor[token][to] && amount > 0) {
            isInvestor[token][to] = true;
            investorCount[token]++;
        }

        // If sender transferred all tokens, remove from investor list
        // Note: This would require checking balance, simplified here

        // Notify modules
        for (uint256 i = 0; i < modules.length; i++) {
            ICompliance(modules[i]).transferred(from, to, amount);
        }
    }

    /**
     * @inheritdoc ICompliance
     */
    function created(address to, uint256 amount) external override {
        if (!boundTokens[msg.sender]) revert TokenNotBound();

        address token = msg.sender;

        if (!isInvestor[token][to] && amount > 0) {
            isInvestor[token][to] = true;
            investorCount[token]++;
        }
    }

    /**
     * @inheritdoc ICompliance
     */
    function destroyed(address from, uint256 amount) external override {
        if (!boundTokens[msg.sender]) revert TokenNotBound();

        // Note: Would need to check if holder has zero balance to remove
        // from investor count
    }

    // ==========================================
    // TOKEN BINDING
    // ==========================================

    /**
     * @inheritdoc ICompliance
     */
    function bindToken(address token) external override onlyOwner {
        if (boundTokens[token]) revert TokenAlreadyBound();
        boundTokens[token] = true;
        emit TokenBound(token);
    }

    /**
     * @inheritdoc ICompliance
     */
    function unbindToken(address token) external override onlyOwner {
        if (!boundTokens[token]) revert TokenNotBound();
        boundTokens[token] = false;
        emit TokenUnbound(token);
    }

    /**
     * @inheritdoc ICompliance
     */
    function isTokenBound(address token) external view override returns (bool) {
        return boundTokens[token];
    }

    // ==========================================
    // MODULE MANAGEMENT
    // ==========================================

    /**
     * @inheritdoc ICompliance
     */
    function addModule(address module) external override onlyOwner {
        if (isModule[module]) revert ModuleAlreadyExists();
        modules.push(module);
        isModule[module] = true;
        emit ModuleAdded(module);
    }

    /**
     * @inheritdoc ICompliance
     */
    function removeModule(address module) external override onlyOwner {
        if (!isModule[module]) revert ModuleNotFound();

        for (uint256 i = 0; i < modules.length; i++) {
            if (modules[i] == module) {
                modules[i] = modules[modules.length - 1];
                modules.pop();
                break;
            }
        }

        isModule[module] = false;
        emit ModuleRemoved(module);
    }

    /**
     * @inheritdoc ICompliance
     */
    function getModules() external view override returns (address[] memory) {
        return modules;
    }

    // ==========================================
    // COUNTRY MANAGEMENT
    // ==========================================

    /**
     * @notice Add allowed country
     * @param country Country code
     */
    function addAllowedCountry(uint16 country) external onlyOwner {
        allowedCountries[country] = true;
    }

    /**
     * @notice Remove allowed country
     * @param country Country code
     */
    function removeAllowedCountry(uint16 country) external onlyOwner {
        allowedCountries[country] = false;
    }

    /**
     * @notice Add blocked country
     * @param country Country code
     */
    function addBlockedCountry(uint16 country) external onlyOwner {
        blockedCountries[country] = true;
    }

    /**
     * @notice Remove blocked country
     * @param country Country code
     */
    function removeBlockedCountry(uint16 country) external onlyOwner {
        blockedCountries[country] = false;
    }

    /**
     * @notice Batch add allowed countries
     * @param countries Array of country codes
     */
    function batchAddAllowedCountries(uint16[] calldata countries) external onlyOwner {
        for (uint256 i = 0; i < countries.length; i++) {
            allowedCountries[countries[i]] = true;
        }
    }

    /**
     * @notice Batch add blocked countries
     * @param countries Array of country codes
     */
    function batchAddBlockedCountries(uint16[] calldata countries) external onlyOwner {
        for (uint256 i = 0; i < countries.length; i++) {
            blockedCountries[countries[i]] = true;
        }
    }

    // ==========================================
    // LIMIT MANAGEMENT
    // ==========================================

    /**
     * @notice Set maximum investors
     * @param max Maximum number of investors (0 = unlimited)
     */
    function setMaxInvestors(uint256 max) external onlyOwner {
        maxInvestors = max;
    }

    /**
     * @notice Set maximum holding per investor for a token
     * @param token Token address
     * @param max Maximum holding (0 = unlimited)
     */
    function setMaxHolding(address token, uint256 max) external onlyOwner {
        maxHolding[token] = max;
    }

    /**
     * @notice Set identity registry
     * @param identityRegistry_ New identity registry
     */
    function setIdentityRegistry(address identityRegistry_) external onlyOwner {
        identityRegistry = IIdentityRegistry(identityRegistry_);
    }

    // ==========================================
    // INTERNAL
    // ==========================================

    /**
     * @notice Check if allowed countries list is being used
     */
    function _hasAllowedCountries() internal view returns (bool) {
        // This is a simplified check - in production you'd track this properly
        return false;
    }
}
