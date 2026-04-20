// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PreglyphRegistry {
    error NotOwner();
    error EmptyContent();
    error ContentTooLong();
    error InvalidUtf8Content();
    error InvalidWriteFee();
    error InvalidRecipient();

    uint256 public constant MAX_CONTENT_LENGTH = 100;
    uint256 public immutable WRITE_FEE_WEI;

    struct Record {
        uint256 id;
        address author;
        string content;
        uint256 createdAt;
    }

    address public immutable owner;
    uint256 public recordCount;

    mapping(uint256 => Record) private records;

    event RecordWritten(uint256 indexed recordId, address indexed author, string content, uint256 createdAt);
    event FeesWithdrawn(address indexed recipient, uint256 amount, uint256 withdrawnAt);

    constructor(address initialOwner, uint256 initialWriteFeeWei) {
        owner = initialOwner;
        WRITE_FEE_WEI = initialWriteFeeWei;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function writeRecord(string calldata content) external payable returns (uint256 recordId) {
        bytes memory contentBytes = bytes(content);
        if (contentBytes.length == 0) revert EmptyContent();
        if (_countUtf8CodePoints(contentBytes) > MAX_CONTENT_LENGTH) revert ContentTooLong();
        if (msg.value != WRITE_FEE_WEI) revert InvalidWriteFee();

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

    function withdrawFees(address payable recipient) external onlyOwner {
        if (recipient == address(0)) revert InvalidRecipient();
        uint256 amount = address(this).balance;
        (bool ok, ) = recipient.call{value: amount}("");
        require(ok, "WITHDRAW_FAILED");
        emit FeesWithdrawn(recipient, amount, block.timestamp);
    }

    function getRecord(uint256 recordId) external view returns (Record memory) {
        return records[recordId];
    }

    function _countUtf8CodePoints(bytes memory contentBytes) private pure returns (uint256 count) {
        uint256 i = 0;
        while (i < contentBytes.length) {
            uint8 b0 = uint8(contentBytes[i]);

            if (b0 < 0x80) {
                i += 1;
                count += 1;
                continue;
            }

            if (b0 < 0xC2) revert InvalidUtf8Content();

            if (b0 < 0xE0) {
                if (i + 1 >= contentBytes.length) revert InvalidUtf8Content();
                uint8 b1 = uint8(contentBytes[i + 1]);
                if ((b1 & 0xC0) != 0x80) revert InvalidUtf8Content();
                i += 2;
                count += 1;
                continue;
            }

            if (b0 < 0xF0) {
                if (i + 2 >= contentBytes.length) revert InvalidUtf8Content();
                uint8 b1 = uint8(contentBytes[i + 1]);
                uint8 b2 = uint8(contentBytes[i + 2]);
                if ((b1 & 0xC0) != 0x80 || (b2 & 0xC0) != 0x80) revert InvalidUtf8Content();
                if (b0 == 0xE0 && b1 < 0xA0) revert InvalidUtf8Content();
                if (b0 == 0xED && b1 >= 0xA0) revert InvalidUtf8Content();
                i += 3;
                count += 1;
                continue;
            }

            if (b0 < 0xF5) {
                if (i + 3 >= contentBytes.length) revert InvalidUtf8Content();
                uint8 b1 = uint8(contentBytes[i + 1]);
                uint8 b2 = uint8(contentBytes[i + 2]);
                uint8 b3 = uint8(contentBytes[i + 3]);
                if ((b1 & 0xC0) != 0x80 || (b2 & 0xC0) != 0x80 || (b3 & 0xC0) != 0x80) revert InvalidUtf8Content();
                if (b0 == 0xF0 && b1 < 0x90) revert InvalidUtf8Content();
                if (b0 == 0xF4 && b1 >= 0x90) revert InvalidUtf8Content();
                i += 4;
                count += 1;
                continue;
            }

            revert InvalidUtf8Content();
        }
    }
}
