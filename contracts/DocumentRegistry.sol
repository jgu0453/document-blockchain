// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// import "@openzeppelin/contracts/access/AccessControl.sol";

contract DocumentRegistry {
    // bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    struct Document {
        bytes32 docHash;
        address issuer;
        uint256 issuedAt;
        string uri;
    }

    mapping(bytes32 => Document) private documents;

    event DocumentRegistered(
        bytes32 indexed docId,
        bytes32 indexed docHash,
        address indexed issuer,
        string uri
    );

    // constructor(address admin) {
    //     _grantRole(DEFAULT_ADMIN_ROLE, admin);
    //     _grantRole(ISSUER_ROLE, admin);
    // }

    function registerDocument(bytes32 docId, bytes32 docHash, string calldata uri)
        external
        // onlyRole(ISSUER_ROLE)
    {
        require(documents[docId].issuedAt == 0, "Document already registered");

        documents[docId] = Document({
            docHash: docHash,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            uri: uri
        });

        emit DocumentRegistered(docId, docHash, msg.sender, uri);
    }

    function getDocument(bytes32 docId) external view returns (Document memory) {
        Document memory doc = documents[docId];
        require(doc.issuedAt != 0, "Document not found");
        return doc;
    }

    function verifyDocument(bytes32 docId, bytes32 docHash) external view returns (bool) {
        Document memory doc = documents[docId];
        return doc.issuedAt != 0 && doc.docHash == docHash;
    }
}
