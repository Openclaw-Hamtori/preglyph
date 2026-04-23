// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PreglyphRegistry {
    error EmptyContent();
    error ContentTooLong();
    error InvalidPermitSigner();
    error InvalidWritePermit();
    error ExpiredWritePermit();
    error WritePermitAlreadyUsed();

    uint256 public constant MAX_CONTENT_LENGTH = 100;

    struct Record {
        uint256 id;
        address author;
        string content;
        uint256 createdAt;
    }

    address public immutable permitSigner;
    uint256 public recordCount;
    mapping(uint256 => Record) private records;
    mapping(bytes32 => bool) private usedWritePermits;

    event RecordWritten(uint256 indexed recordId, address indexed author, string content, uint256 createdAt);

    constructor(address signer_) {
        if (signer_ == address(0)) revert InvalidPermitSigner();
        permitSigner = signer_;
    }

    function writeRecord(
        string calldata content,
        uint256 expiresAt,
        bytes32 nonce,
        bytes calldata signature
    ) external returns (uint256 recordId) {
        bytes memory contentBytes = bytes(content);
        if (contentBytes.length == 0) revert EmptyContent();
        if (contentBytes.length > MAX_CONTENT_LENGTH) revert ContentTooLong();
        if (block.timestamp > expiresAt) revert ExpiredWritePermit();

        bytes32 permitDigest = keccak256(
            abi.encodePacked(
                address(this),
                block.chainid,
                msg.sender,
                keccak256(contentBytes),
                expiresAt,
                nonce
            )
        );

        if (usedWritePermits[permitDigest]) revert WritePermitAlreadyUsed();
        if (_recoverSigner(permitDigest, signature) != permitSigner) revert InvalidWritePermit();

        usedWritePermits[permitDigest] = true;

        recordId = ++recordCount;
        uint256 createdAt = block.timestamp;
        records[recordId] = Record({
            id: recordId,
            author: msg.sender,
            content: content,
            createdAt: createdAt
        });

        emit RecordWritten(recordId, msg.sender, content, createdAt);
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
