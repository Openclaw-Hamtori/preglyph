module.exports = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  { inputs: [], name: 'ContentTooLong', type: 'error' },
  { inputs: [], name: 'EmptyContent', type: 'error' },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'recordId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'author', type: 'address' },
      { indexed: false, internalType: 'string', name: 'content', type: 'string' },
      { indexed: false, internalType: 'uint256', name: 'createdAt', type: 'uint256' },
    ],
    name: 'RecordWritten',
    type: 'event',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'recordId', type: 'uint256' }],
    name: 'getRecord',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'id', type: 'uint256' },
          { internalType: 'address', name: 'author', type: 'address' },
          { internalType: 'string', name: 'content', type: 'string' },
          { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
        ],
        internalType: 'struct PreglyphRegistry.Record',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  { inputs: [], name: 'MAX_CONTENT_LENGTH', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'recordCount', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [{ internalType: 'string', name: 'content', type: 'string' }],
    name: 'writeRecord',
    outputs: [{ internalType: 'uint256', name: 'recordId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];
