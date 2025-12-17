// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IIdentityRegistry
 * @notice Interface for identity registry in ERC-3643 compliance
 * @dev Manages investor identities and their verification status
 */
interface IIdentityRegistry {
    // ==========================================
    // EVENTS
    // ==========================================

    event IdentityRegistered(address indexed investor, address indexed identity);
    event IdentityRemoved(address indexed investor, address indexed identity);
    event IdentityUpdated(address indexed oldIdentity, address indexed newIdentity);
    event CountryUpdated(address indexed investor, uint16 indexed country);
    event ClaimTopicsRegistrySet(address indexed claimTopicsRegistry);
    event TrustedIssuersRegistrySet(address indexed trustedIssuersRegistry);

    // ==========================================
    // IDENTITY MANAGEMENT
    // ==========================================

    /**
     * @notice Register an identity for an investor
     * @param investor The investor wallet address
     * @param identity The identity contract address
     * @param country The investor's country code (ISO 3166-1 numeric)
     */
    function registerIdentity(
        address investor,
        address identity,
        uint16 country
    ) external;

    /**
     * @notice Update an investor's identity
     * @param investor The investor wallet address
     * @param identity The new identity contract address
     */
    function updateIdentity(
        address investor,
        address identity
    ) external;

    /**
     * @notice Update an investor's country
     * @param investor The investor wallet address
     * @param country The new country code
     */
    function updateCountry(
        address investor,
        uint16 country
    ) external;

    /**
     * @notice Remove an investor's identity
     * @param investor The investor wallet address
     */
    function deleteIdentity(address investor) external;

    // ==========================================
    // VERIFICATION
    // ==========================================

    /**
     * @notice Check if an investor is verified
     * @param investor The investor wallet address
     * @return True if verified
     */
    function isVerified(address investor) external view returns (bool);

    /**
     * @notice Get the identity contract for an investor
     * @param investor The investor wallet address
     * @return The identity contract address
     */
    function identity(address investor) external view returns (address);

    /**
     * @notice Get the country code for an investor
     * @param investor The investor wallet address
     * @return The country code
     */
    function investorCountry(address investor) external view returns (uint16);

    // ==========================================
    // BATCH OPERATIONS
    // ==========================================

    /**
     * @notice Register multiple identities
     * @param investors Array of investor addresses
     * @param identities Array of identity addresses
     * @param countries Array of country codes
     */
    function batchRegisterIdentity(
        address[] calldata investors,
        address[] calldata identities,
        uint16[] calldata countries
    ) external;

    // ==========================================
    // REGISTRY MANAGEMENT
    // ==========================================

    /**
     * @notice Set the claim topics registry
     * @param claimTopicsRegistry The new claim topics registry address
     */
    function setClaimTopicsRegistry(address claimTopicsRegistry) external;

    /**
     * @notice Set the trusted issuers registry
     * @param trustedIssuersRegistry The new trusted issuers registry address
     */
    function setTrustedIssuersRegistry(address trustedIssuersRegistry) external;

    /**
     * @notice Check if identity has required claims
     * @param identity The identity address
     * @return True if has all required claims
     */
    function hasRequiredClaims(address identity) external view returns (bool);
}
