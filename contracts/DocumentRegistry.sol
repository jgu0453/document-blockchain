// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DocumentRegistry {
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

    function registerDocument(bytes32 docId, bytes32 docHash, string calldata uri)
        external
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
