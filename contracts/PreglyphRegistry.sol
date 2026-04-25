// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PreglyphRegistry {
    error NotOwner();
    error InvalidOwner();
    error EmptyContent();
    error ContentTooLong();
    error InvalidPermitSigner();
    error InvalidTreasury();
    error InvalidWritePermit();
    error ExpiredWritePermit();
    error WritePermitAlreadyUsed();
    error IncorrectWriteFee();
    error FeeTransferFailed();

    uint256 public constant MAX_CONTENT_LENGTH = 400;

    struct Record {
        uint256 id;
        address author;
        string content;
        uint8 inscriptionMode;
        uint256 createdAt;
    }

    address public owner;
    address public permitSigner;
    address public treasury;
    uint256 public recordCount;
    mapping(uint256 => Record) private records;
    mapping(bytes32 => bool) private usedWritePermits;

    event RecordWritten(uint256 indexed recordId, address indexed author, string content, uint256 createdAt);
    event RecordWrittenV2(uint256 indexed recordId, address indexed author, string content, uint256 createdAt, uint8 inscriptionMode);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address signer_, address treasury_) {
        if (signer_ == address(0)) revert InvalidPermitSigner();
        if (treasury_ == address(0)) revert InvalidTreasury();
        owner = treasury_;
        permitSigner = signer_;
        treasury = treasury_;
    }

    function setPermitSigner(address signer_) external onlyOwner {
        if (signer_ == address(0)) revert InvalidPermitSigner();
        permitSigner = signer_;
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert InvalidTreasury();
        treasury = treasury_;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidOwner();
        owner = newOwner;
    }

    function writeRecord(
        string calldata content,
        uint8 inscriptionMode,
        uint256 expiresAt,
        bytes32 nonce,
        uint256 feeWei,
        bytes calldata signature
    ) external payable returns (uint256 recordId) {
        bytes memory contentBytes = bytes(content);
        if (contentBytes.length == 0) revert EmptyContent();
        if (contentBytes.length > MAX_CONTENT_LENGTH) revert ContentTooLong();
        if (block.timestamp > expiresAt) revert ExpiredWritePermit();
        if (msg.value != feeWei) revert IncorrectWriteFee();

        bytes32 permitDigest = keccak256(
            abi.encodePacked(
                address(this),
                block.chainid,
                msg.sender,
                keccak256(contentBytes),
                inscriptionMode,
                expiresAt,
                nonce,
                feeWei
            )
        );

        if (usedWritePermits[permitDigest]) revert WritePermitAlreadyUsed();
        if (_recoverSigner(permitDigest, signature) != permitSigner) revert InvalidWritePermit();

        usedWritePermits[permitDigest] = true;

        if (feeWei > 0) {
            (bool sent,) = payable(treasury).call{value: feeWei}("");
            if (!sent) revert FeeTransferFailed();
        }

        recordId = ++recordCount;
        uint256 createdAt = block.timestamp;
        records[recordId] = Record({
            id: recordId,
            author: msg.sender,
            content: content,
            inscriptionMode: inscriptionMode,
            createdAt: createdAt
        });

        emit RecordWritten(recordId, msg.sender, content, createdAt);
        emit RecordWrittenV2(recordId, msg.sender, content, createdAt, inscriptionMode);
    }

    function getRecord(uint256 recordId) external view returns (Record memory) {
        return records[recordId];
    }

    function _recoverSigner(bytes32 digest, bytes calldata signature) private pure returns (address recovered) {
        if (signature.length != 65) return address(0);

        bytes32 r;
        bytes32 s;
        uint8 v;
        bytes32 prefixedDigest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", digest));

        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        if (v < 27) {
            v += 27;
        }
        if (v != 27 && v != 28) {
            return address(0);
        }

        recovered = ecrecover(prefixedDigest, v, r, s);
    }
}
