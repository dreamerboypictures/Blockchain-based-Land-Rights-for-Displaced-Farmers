# 🌍 Blockchain-based Land Rights for Displaced Farmers

Welcome to a revolutionary Web3 solution for securing land tenure in post-conflict regions! This project uses the Stacks blockchain and Clarity smart contracts to provide immutable, transparent land ownership records for displaced farmers, helping prevent disputes, rebuild communities, and enable access to credit and resources.

## ✨ Features

🔒 Immutable registration of land parcels with geolocation data  
📜 Secure ownership verification to prove tenure rights  
🔄 Easy transfer of land titles between verified parties  
⚖️ Built-in dispute resolution mechanism for fair adjudication  
💰 Integration with escrow for safe land transactions  
📈 Ownership history tracking for transparency  
🏛️ Community governance for updating land policies  
🚫 Prevention of fraudulent claims through multi-signature approvals  
🌐 Support for international aid organizations to endorse records  

## 🛠 How It Works

This project involves 8 smart contracts written in Clarity, each handling a specific aspect of land rights management. Together, they create a decentralized system that empowers farmers to reclaim and secure their land without relying on fragile centralized records.

### Core Smart Contracts
1. **LandRegistry.clar**: Registers new land parcels with unique IDs, owner details, and geolocation hashes (e.g., GPS coordinates hashed for privacy).  
2. **OwnershipToken.clar**: Issues NFTs representing land titles, ensuring each parcel has a unique, transferable token.  
3. **TransferContract.clar**: Handles secure ownership transfers, requiring multi-party confirmation to prevent unauthorized changes.  
4. **DisputeResolution.clar**: Allows filing disputes with evidence; uses voting or oracle integration for resolution.  
5. **EscrowService.clar**: Manages escrowed STX (Stacks tokens) during transactions, releasing funds only on successful transfer.  
6. **VerificationEngine.clar**: Provides public functions to query and verify ownership details instantly.  
7. **HistoryTracker.clar**: Logs all changes to land records in an immutable audit trail for historical transparency.  
8. **GovernanceDAO.clar**: Enables community voting on system updates, like adding new verifiers or policy changes.

**For Farmers (Owners)**  
- Hash your land documents and geolocation data.  
- Call `register-land` in LandRegistry.clar with your details to create an NFT title.  
- To transfer, use TransferContract.clar with the buyer's address and escrow funds.  
- If a dispute arises, submit evidence via DisputeResolution.clar.  

Boom! Your land rights are now blockchain-secured, accessible worldwide.

**For Verifiers (e.g., Aid Organizations, Governments)**  
- Use VerificationEngine.clar to check ownership with `verify-tenure` and a land ID.  
- Query HistoryTracker.clar for full transaction logs.  
- Participate in governance via GovernanceDAO.clar to endorse or update records.

**For Buyers or Transferees**  
- Initiate a transfer request through TransferContract.clar.  
- Deposit funds into EscrowService.clar for secure holding.  
- Once confirmed, receive the NFT title automatically.

This system solves real-world issues like lost records in conflict zones by leveraging blockchain's immutability, reducing corruption and enabling economic recovery for farmers. Deploy on Stacks for low-cost, Bitcoin-secured transactions!