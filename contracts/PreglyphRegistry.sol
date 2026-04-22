// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PreglyphRegistry {
    error EmptyContent();
    error ContentTooLong();

    uint256 public constant MAX_CONTENT_LENGTH = 280;

    struct Record {
        uint256 id;
        address author;
        string content;
        uint256 createdAt;
    }

    uint256 public recordCount;
    mapping(uint256 => Record) private records;

    event RecordWritten(uint256 indexed recordId, address indexed author, string content, uint256 createdAt);

    function writeRecord(string calldata content) external returns (uint256 recordId) {
        bytes memory contentBytes = bytes(content);
        if (contentBytes.length == 0) revert EmptyContent();
        if (contentBytes.length > MAX_CONTENT_LENGTH) revert ContentTooLong();

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
}
