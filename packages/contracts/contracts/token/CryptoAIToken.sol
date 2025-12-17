// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "../interfaces/IIdentityRegistry.sol";
import "../interfaces/ICompliance.sol";

/**
 * @title CryptoAIToken
 * @notice ERC-3643 compliant security token for CryptoAI platform
 * @dev Implements transfer restrictions via identity registry and compliance module
 */
contract CryptoAIToken is
    ERC20,
    ERC20Burnable,
    ERC20Pausable,
    AccessControl,
    ReentrancyGuard
{
    // ==========================================
    // ROLES
    // ==========================================

    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 public constant FREEZER_ROLE = keccak256("FREEZER_ROLE");

    // ==========================================
    // STATE VARIABLES
    // ==========================================

    /// @notice Identity registry for investor verification
    IIdentityRegistry public identityRegistry;

    /// @notice Compliance module for transfer rules
    ICompliance public compliance;

    /// @notice Token decimals
    uint8 private _decimals;

    /// @notice Maximum supply (0 = unlimited)
    uint256 public maxSupply;

    /// @notice Frozen addresses
    mapping(address => bool) public frozen;

    /// @notice Locked tokens per address (for vesting, lock-ups, etc.)
    mapping(address => uint256) public lockedTokens;

    /// @notice Token metadata URI
    string public tokenURI;

    // ==========================================
    // EVENTS
    // ==========================================

    event IdentityRegistrySet(address indexed identityRegistry);
    event ComplianceSet(address indexed compliance);
    event AddressFrozen(address indexed account, bool isFrozen);
    event TokensLocked(address indexed account, uint256 amount);
    event TokensUnlocked(address indexed account, uint256 amount);
    event RecoveryExecuted(address indexed lostWallet, address indexed newWallet, address indexed investor);
    event ForcedTransfer(address indexed from, address indexed to, uint256 amount, bytes data);

    // ==========================================
    // ERRORS
    // ==========================================

    error AddressIsFrozen(address account);
    error InsufficientUnlockedBalance(address account, uint256 available, uint256 required);
    error TransferNotCompliant(address from, address to, uint256 amount);
    error IdentityNotVerified(address account);
    error MaxSupplyExceeded(uint256 requested, uint256 max);
    error InvalidAddress();

    // ==========================================
    // CONSTRUCTOR
    // ==========================================

    /**
     * @notice Initialize the token
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param decimals_ Token decimals
     * @param maxSupply_ Maximum supply (0 for unlimited)
     * @param identityRegistry_ Identity registry address
     * @param compliance_ Compliance module address
     * @param owner_ Initial owner address
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 maxSupply_,
        address identityRegistry_,
        address compliance_,
        address owner_
    ) ERC20(name_, symbol_) {
        if (owner_ == address(0)) revert InvalidAddress();

        _decimals = decimals_;
        maxSupply = maxSupply_;

        if (identityRegistry_ != address(0)) {
            identityRegistry = IIdentityRegistry(identityRegistry_);
        }

        if (compliance_ != address(0)) {
            compliance = ICompliance(compliance_);
        }

        _grantRole(DEFAULT_ADMIN_ROLE, owner_);
        _grantRole(AGENT_ROLE, owner_);
        _grantRole(FREEZER_ROLE, owner_);
    }

    // ==========================================
    // ERC20 OVERRIDES
    // ==========================================

    /**
     * @notice Returns token decimals
     */
    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Transfer tokens with compliance checks
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        _checkTransfer(msg.sender, to, amount);
        return super.transfer(to, amount);
    }

    /**
     * @notice Transfer tokens from with compliance checks
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        _checkTransfer(from, to, amount);
        return super.transferFrom(from, to, amount);
    }

    // ==========================================
    // COMPLIANCE CHECKS
    // ==========================================

    /**
     * @notice Check if transfer is compliant
     */
    function _checkTransfer(
        address from,
        address to,
        uint256 amount
    ) internal view {
        // Check frozen status
        if (frozen[from]) revert AddressIsFrozen(from);
        if (frozen[to]) revert AddressIsFrozen(to);

        // Check locked balance
        uint256 available = balanceOf(from) - lockedTokens[from];
        if (amount > available) {
            revert InsufficientUnlockedBalance(from, available, amount);
        }

        // Check identity registry
        if (address(identityRegistry) != address(0)) {
            if (!identityRegistry.isVerified(to)) {
                revert IdentityNotVerified(to);
            }
        }

        // Check compliance
        if (address(compliance) != address(0)) {
            if (!compliance.canTransfer(from, to, amount)) {
                revert TransferNotCompliant(from, to, amount);
            }
        }
    }

    /**
     * @notice Check if transfer can succeed (view function)
     */
    function canTransfer(
        address from,
        address to,
        uint256 amount
    ) external view returns (bool, string memory) {
        if (frozen[from]) return (false, "Sender is frozen");
        if (frozen[to]) return (false, "Recipient is frozen");

        uint256 available = balanceOf(from) - lockedTokens[from];
        if (amount > available) return (false, "Insufficient unlocked balance");

        if (address(identityRegistry) != address(0)) {
            if (!identityRegistry.isVerified(to)) {
                return (false, "Recipient identity not verified");
            }
        }

        if (address(compliance) != address(0)) {
            if (!compliance.canTransfer(from, to, amount)) {
                return (false, "Transfer not compliant");
            }
        }

        return (true, "");
    }

    // ==========================================
    // MINTING
    // ==========================================

    /**
     * @notice Mint tokens to verified address
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyRole(AGENT_ROLE) {
        if (maxSupply > 0 && totalSupply() + amount > maxSupply) {
            revert MaxSupplyExceeded(totalSupply() + amount, maxSupply);
        }

        // Verify recipient identity
        if (address(identityRegistry) != address(0)) {
            if (!identityRegistry.isVerified(to)) {
                revert IdentityNotVerified(to);
            }
        }

        _mint(to, amount);
    }

    /**
     * @notice Batch mint to multiple addresses
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts
     */
    function batchMint(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyRole(AGENT_ROLE) {
        require(recipients.length == amounts.length, "Array length mismatch");

        uint256 totalAmount;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        if (maxSupply > 0 && totalSupply() + totalAmount > maxSupply) {
            revert MaxSupplyExceeded(totalSupply() + totalAmount, maxSupply);
        }

        for (uint256 i = 0; i < recipients.length; i++) {
            if (address(identityRegistry) != address(0)) {
                if (!identityRegistry.isVerified(recipients[i])) {
                    revert IdentityNotVerified(recipients[i]);
                }
            }
            _mint(recipients[i], amounts[i]);
        }
    }

    // ==========================================
    // FREEZING
    // ==========================================

    /**
     * @notice Freeze an address
     * @param account Address to freeze
     */
    function freeze(address account) external onlyRole(FREEZER_ROLE) {
        frozen[account] = true;
        emit AddressFrozen(account, true);
    }

    /**
     * @notice Unfreeze an address
     * @param account Address to unfreeze
     */
    function unfreeze(address account) external onlyRole(FREEZER_ROLE) {
        frozen[account] = false;
        emit AddressFrozen(account, false);
    }

    /**
     * @notice Batch freeze addresses
     * @param accounts Array of addresses to freeze
     */
    function batchFreeze(address[] calldata accounts) external onlyRole(FREEZER_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            frozen[accounts[i]] = true;
            emit AddressFrozen(accounts[i], true);
        }
    }

    // ==========================================
    // LOCKING
    // ==========================================

    /**
     * @notice Lock tokens for an address
     * @param account Address to lock tokens for
     * @param amount Amount to lock
     */
    function lockTokens(address account, uint256 amount) external onlyRole(AGENT_ROLE) {
        require(balanceOf(account) >= amount, "Insufficient balance to lock");
        lockedTokens[account] = amount;
        emit TokensLocked(account, amount);
    }

    /**
     * @notice Unlock tokens for an address
     * @param account Address to unlock tokens for
     * @param amount Amount to unlock
     */
    function unlockTokens(address account, uint256 amount) external onlyRole(AGENT_ROLE) {
        require(lockedTokens[account] >= amount, "Insufficient locked balance");
        lockedTokens[account] -= amount;
        emit TokensUnlocked(account, amount);
    }

    /**
     * @notice Get available (unlocked) balance
     * @param account Address to check
     */
    function availableBalance(address account) external view returns (uint256) {
        return balanceOf(account) - lockedTokens[account];
    }

    // ==========================================
    // FORCED TRANSFER (REGULATORY)
    // ==========================================

    /**
     * @notice Force transfer tokens (for regulatory compliance)
     * @param from Source address
     * @param to Destination address
     * @param amount Amount to transfer
     * @param data Additional data for audit trail
     */
    function forcedTransfer(
        address from,
        address to,
        uint256 amount,
        bytes calldata data
    ) external onlyRole(AGENT_ROLE) nonReentrant {
        // Verify recipient identity
        if (address(identityRegistry) != address(0)) {
            if (!identityRegistry.isVerified(to)) {
                revert IdentityNotVerified(to);
            }
        }

        _transfer(from, to, amount);
        emit ForcedTransfer(from, to, amount, data);
    }

    // ==========================================
    // RECOVERY
    // ==========================================

    /**
     * @notice Recover tokens from lost wallet
     * @param lostWallet The lost wallet address
     * @param newWallet The new wallet address
     * @param investor The investor identity
     */
    function recoveryTransfer(
        address lostWallet,
        address newWallet,
        address investor
    ) external onlyRole(AGENT_ROLE) nonReentrant {
        if (newWallet == address(0)) revert InvalidAddress();

        // Verify new wallet identity
        if (address(identityRegistry) != address(0)) {
            if (!identityRegistry.isVerified(newWallet)) {
                revert IdentityNotVerified(newWallet);
            }
        }

        uint256 balance = balanceOf(lostWallet);
        _transfer(lostWallet, newWallet, balance);

        // Transfer locked tokens tracking
        if (lockedTokens[lostWallet] > 0) {
            lockedTokens[newWallet] = lockedTokens[lostWallet];
            lockedTokens[lostWallet] = 0;
        }

        emit RecoveryExecuted(lostWallet, newWallet, investor);
    }

    // ==========================================
    // PAUSABLE
    // ==========================================

    /**
     * @notice Pause all transfers
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause all transfers
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ==========================================
    // CONFIGURATION
    // ==========================================

    /**
     * @notice Set identity registry
     * @param identityRegistry_ New identity registry address
     */
    function setIdentityRegistry(
        address identityRegistry_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        identityRegistry = IIdentityRegistry(identityRegistry_);
        emit IdentityRegistrySet(identityRegistry_);
    }

    /**
     * @notice Set compliance module
     * @param compliance_ New compliance address
     */
    function setCompliance(
        address compliance_
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        compliance = ICompliance(compliance_);
        emit ComplianceSet(compliance_);
    }

    /**
     * @notice Set token metadata URI
     * @param uri_ New URI
     */
    function setTokenURI(string calldata uri_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenURI = uri_;
    }

    // ==========================================
    // INTERNAL OVERRIDES
    // ==========================================

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}
