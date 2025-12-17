// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICompliance
 * @notice Interface for compliance module in ERC-3643
 * @dev Implements transfer rules and restrictions
 */
interface ICompliance {
    // ==========================================
    // EVENTS
    // ==========================================

    event TokenBound(address indexed token);
    event TokenUnbound(address indexed token);
    event ModuleAdded(address indexed module);
    event ModuleRemoved(address indexed module);

    // ==========================================
    // COMPLIANCE CHECK
    // ==========================================

    /**
     * @notice Check if a transfer is compliant
     * @param from Source address
     * @param to Destination address
     * @param amount Transfer amount
     * @return True if transfer is compliant
     */
    function canTransfer(
        address from,
        address to,
        uint256 amount
    ) external view returns (bool);

    /**
     * @notice Called when a transfer is executed
     * @param from Source address
     * @param to Destination address
     * @param amount Transfer amount
     */
    function transferred(
        address from,
        address to,
        uint256 amount
    ) external;

    /**
     * @notice Called when tokens are created
     * @param to Recipient address
     * @param amount Amount created
     */
    function created(address to, uint256 amount) external;

    /**
     * @notice Called when tokens are destroyed
     * @param from Holder address
     * @param amount Amount destroyed
     */
    function destroyed(address from, uint256 amount) external;

    // ==========================================
    // TOKEN BINDING
    // ==========================================

    /**
     * @notice Bind compliance to a token
     * @param token Token address
     */
    function bindToken(address token) external;

    /**
     * @notice Unbind compliance from a token
     * @param token Token address
     */
    function unbindToken(address token) external;

    /**
     * @notice Check if token is bound
     * @param token Token address
     * @return True if bound
     */
    function isTokenBound(address token) external view returns (bool);

    // ==========================================
    // MODULE MANAGEMENT
    // ==========================================

    /**
     * @notice Add a compliance module
     * @param module Module address
     */
    function addModule(address module) external;

    /**
     * @notice Remove a compliance module
     * @param module Module address
     */
    function removeModule(address module) external;

    /**
     * @notice Get all active modules
     * @return Array of module addresses
     */
    function getModules() external view returns (address[] memory);
}
