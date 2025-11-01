import { expect } from "chai";
import { ethers } from "hardhat";

describe("DocumentRegistry", () => {
  it("registers and verifies documents", async () => {
    const [admin, issuer, outsider] = await ethers.getSigners();

    const registry = await ethers.deployContract("DocumentRegistry", [admin.address]);
    await registry.waitForDeployment();

    const issuerRole = await registry.ISSUER_ROLE();
    await registry.connect(admin).grantRole(issuerRole, issuer.address);

    const docId = ethers.id("passport-123");
    const docHash = ethers.id("original-file");

    await registry.connect(issuer).registerDocument(docId, docHash, "ipfs://example");

    const record = await registry.getDocument(docId);
    expect(record.docHash).to.equal(docHash);
    expect(record.issuer).to.equal(issuer.address);

    expect(await registry.verifyDocument(docId, docHash)).to.equal(true);
    expect(await registry.verifyDocument(docId, ethers.id("tampered"))).to.equal(false);

    await expect(
      registry.connect(outsider).registerDocument(docId, docHash, "")
    ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount").withArgs(
      outsider.address,
      issuerRole
    );
  });
});
