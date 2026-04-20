// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PreglyphRegistry {
    error NotOwner();
    error WriterNotApproved();
    error EmptyContent();
    error ContentTooLong();

    uint256 public constant MAX_CONTENT_LENGTH = 280;

    struct Record {
        uint256 id;
        address author;
        string content;
        uint256 createdAt;
    }

    address public immutable owner;
    uint256 public recordCount;

    mapping(address => bool) public approvedWriters;
    mapping(uint256 => Record) private records;

    event WriterApprovalUpdated(address indexed writer, bool approved, uint256 updatedAt);
    event RecordWritten(uint256 indexed recordId, address indexed author, string content, uint256 createdAt);

    constructor(address initialOwner) {
        owner = initialOwner;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyApprovedWriter() {
        if (!approvedWriters[msg.sender]) revert WriterNotApproved();
        _;
    }

    function setWriterApproval(address writer, bool approved) external onlyOwner {
        approvedWriters[writer] = approved;
        emit WriterApprovalUpdated(writer, approved, block.timestamp);
    }

    function writeRecord(string calldata content) external onlyApprovedWriter returns (uint256 recordId) {
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
