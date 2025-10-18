import { describe, it, expect, beforeEach } from "vitest";
import { buffCV, stringUtf8CV, uintCV, tupleCV, intCV, listCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_PARCEL_ID = 101;
const ERR_INVALID_OWNER = 102;
const ERR_INVALID_GEOLOC_HASH = 103;
const ERR_INVALID_METADATA = 104;
const ERR_PARCEL_ALREADY_EXISTS = 105;
const ERR_PARCEL_NOT_FOUND = 106;
const ERR_INVALID_TIMESTAMP = 107;
const ERR_AUTHORITY_NOT_VERIFIED = 108;
const ERR_INVALID_SIZE = 109;
const ERR_INVALID_LOCATION = 110;
const ERR_INVALID_STATUS = 111;
const ERR_UPDATE_NOT_ALLOWED = 112;
const ERR_INVALID_UPDATE_PARAM = 113;
const ERR_MAX_PARCELS_EXCEEDED = 114;
const ERR_INVALID_PARCEL_TYPE = 115;
const ERR_INVALID_DOCUMENT_HASH = 116;
const ERR_INVALID_VERIFIER = 117;
const ERR_REGISTRATION_FEE_NOT_PAID = 118;
const ERR_INVALID_CURRENCY = 119;
const ERR_INVALID_BOUNDARIES = 120;

interface Parcel {
  owner: string;
  geolocHash: Uint8Array;
  metadata: string;
  timestamp: number;
  parcelType: string;
  documentHash: Uint8Array;
  size: number;
  location: string;
  status: boolean;
  boundaries: Array<{ lat: number; lon: number }>;
}

interface ParcelUpdate {
  updateOwner: string;
  updateMetadata: string;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class LandRegistryMock {
  state: {
    nextParcelId: number;
    maxParcels: number;
    registrationFee: number;
    authorityContract: string | null;
    parcels: Map<number, Parcel>;
    parcelUpdates: Map<number, ParcelUpdate>;
    parcelsByGeoloc: Map<string, number>;
  } = {
    nextParcelId: 0,
    maxParcels: 100000,
    registrationFee: 5000,
    authorityContract: null,
    parcels: new Map(),
    parcelUpdates: new Map(),
    parcelsByGeoloc: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextParcelId: 0,
      maxParcels: 100000,
      registrationFee: 5000,
      authorityContract: null,
      parcels: new Map(),
      parcelUpdates: new Map(),
      parcelsByGeoloc: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setRegistrationFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.registrationFee = newFee;
    return { ok: true, value: true };
  }

  registerParcel(
    geolocHash: Uint8Array,
    metadata: string,
    parcelType: string,
    documentHash: Uint8Array,
    size: number,
    location: string,
    boundaries: Array<{ lat: number; lon: number }>
  ): Result<number> {
    if (this.state.nextParcelId >= this.state.maxParcels) return { ok: false, value: ERR_MAX_PARCELS_EXCEEDED };
    if (geolocHash.length !== 32) return { ok: false, value: ERR_INVALID_GEOLOC_HASH };
    if (metadata.length > 256) return { ok: false, value: ERR_INVALID_METADATA };
    if (!["agricultural", "residential", "commercial"].includes(parcelType)) return { ok: false, value: ERR_INVALID_PARCEL_TYPE };
    if (documentHash.length !== 32) return { ok: false, value: ERR_INVALID_DOCUMENT_HASH };
    if (size <= 0) return { ok: false, value: ERR_INVALID_SIZE };
    if (!location || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (boundaries.length < 3) return { ok: false, value: ERR_INVALID_BOUNDARIES };
    if (this.state.parcelsByGeoloc.has(geolocHash.toString())) return { ok: false, value: ERR_PARCEL_ALREADY_EXISTS };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.registrationFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextParcelId;
    const parcel: Parcel = {
      owner: this.caller,
      geolocHash,
      metadata,
      timestamp: this.blockHeight,
      parcelType,
      documentHash,
      size,
      location,
      status: true,
      boundaries,
    };
    this.state.parcels.set(id, parcel);
    this.state.parcelsByGeoloc.set(geolocHash.toString(), id);
    this.state.nextParcelId++;
    return { ok: true, value: id };
  }

  getParcel(id: number): Parcel | null {
    return this.state.parcels.get(id) || null;
  }

  updateParcel(id: number, updateOwner: string, updateMetadata: string): Result<boolean> {
    const parcel = this.state.parcels.get(id);
    if (!parcel) return { ok: false, value: false };
    if (parcel.owner !== this.caller) return { ok: false, value: false };
    if (updateOwner === "SP000000000000000000002Q6VF78") return { ok: false, value: false };
    if (updateMetadata.length > 256) return { ok: false, value: false };

    const updated: Parcel = {
      ...parcel,
      owner: updateOwner,
      metadata: updateMetadata,
      timestamp: this.blockHeight,
    };
    this.state.parcels.set(id, updated);
    this.state.parcelUpdates.set(id, {
      updateOwner,
      updateMetadata,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getParcelCount(): Result<number> {
    return { ok: true, value: this.state.nextParcelId };
  }

  checkParcelExistence(geolocHash: Uint8Array): Result<boolean> {
    return { ok: true, value: this.state.parcelsByGeoloc.has(geolocHash.toString()) };
  }
}

describe("LandRegistry", () => {
  let contract: LandRegistryMock;

  beforeEach(() => {
    contract = new LandRegistryMock();
    contract.reset();
  });

  it("registers a parcel successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const geolocHash = new Uint8Array(32).fill(1);
    const documentHash = new Uint8Array(32).fill(2);
    const boundaries = [{ lat: 10, lon: 20 }, { lat: 30, lon: 40 }, { lat: 50, lon: 60 }];
    const result = contract.registerParcel(
      geolocHash,
      "Parcel metadata",
      "agricultural",
      documentHash,
      1000,
      "Rural Area",
      boundaries
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const parcel = contract.getParcel(0);
    expect(parcel?.owner).toBe("ST1TEST");
    expect(parcel?.metadata).toBe("Parcel metadata");
    expect(parcel?.parcelType).toBe("agricultural");
    expect(parcel?.size).toBe(1000);
    expect(parcel?.location).toBe("Rural Area");
    expect(parcel?.boundaries).toEqual(boundaries);
    expect(contract.stxTransfers).toEqual([{ amount: 5000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate geoloc hash", () => {
    contract.setAuthorityContract("ST2TEST");
    const geolocHash = new Uint8Array(32).fill(1);
    const documentHash = new Uint8Array(32).fill(2);
    const boundaries = [{ lat: 10, lon: 20 }, { lat: 30, lon: 40 }, { lat: 50, lon: 60 }];
    contract.registerParcel(
      geolocHash,
      "Parcel metadata",
      "agricultural",
      documentHash,
      1000,
      "Rural Area",
      boundaries
    );
    const result = contract.registerParcel(
      geolocHash,
      "New metadata",
      "residential",
      documentHash,
      2000,
      "Urban Area",
      boundaries
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_PARCEL_ALREADY_EXISTS);
  });

  it("rejects registration without authority contract", () => {
    const geolocHash = new Uint8Array(32).fill(1);
    const documentHash = new Uint8Array(32).fill(2);
    const boundaries = [{ lat: 10, lon: 20 }, { lat: 30, lon: 40 }, { lat: 50, lon: 60 }];
    const result = contract.registerParcel(
      geolocHash,
      "Parcel metadata",
      "agricultural",
      documentHash,
      1000,
      "Rural Area",
      boundaries
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid geoloc hash", () => {
    contract.setAuthorityContract("ST2TEST");
    const geolocHash = new Uint8Array(31).fill(1);
    const documentHash = new Uint8Array(32).fill(2);
    const boundaries = [{ lat: 10, lon: 20 }, { lat: 30, lon: 40 }, { lat: 50, lon: 60 }];
    const result = contract.registerParcel(
      geolocHash,
      "Parcel metadata",
      "agricultural",
      documentHash,
      1000,
      "Rural Area",
      boundaries
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_GEOLOC_HASH);
  });

  it("rejects invalid parcel type", () => {
    contract.setAuthorityContract("ST2TEST");
    const geolocHash = new Uint8Array(32).fill(1);
    const documentHash = new Uint8Array(32).fill(2);
    const boundaries = [{ lat: 10, lon: 20 }, { lat: 30, lon: 40 }, { lat: 50, lon: 60 }];
    const result = contract.registerParcel(
      geolocHash,
      "Parcel metadata",
      "invalid",
      documentHash,
      1000,
      "Rural Area",
      boundaries
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PARCEL_TYPE);
  });

  it("updates a parcel successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const geolocHash = new Uint8Array(32).fill(1);
    const documentHash = new Uint8Array(32).fill(2);
    const boundaries = [{ lat: 10, lon: 20 }, { lat: 30, lon: 40 }, { lat: 50, lon: 60 }];
    contract.registerParcel(
      geolocHash,
      "Old metadata",
      "agricultural",
      documentHash,
      1000,
      "Rural Area",
      boundaries
    );
    const result = contract.updateParcel(0, "ST3NEW", "New metadata");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const parcel = contract.getParcel(0);
    expect(parcel?.owner).toBe("ST3NEW");
    expect(parcel?.metadata).toBe("New metadata");
    const update = contract.state.parcelUpdates.get(0);
    expect(update?.updateOwner).toBe("ST3NEW");
    expect(update?.updateMetadata).toBe("New metadata");
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent parcel", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updateParcel(99, "ST3NEW", "New metadata");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-owner", () => {
    contract.setAuthorityContract("ST2TEST");
    const geolocHash = new Uint8Array(32).fill(1);
    const documentHash = new Uint8Array(32).fill(2);
    const boundaries = [{ lat: 10, lon: 20 }, { lat: 30, lon: 40 }, { lat: 50, lon: 60 }];
    contract.registerParcel(
      geolocHash,
      "Parcel metadata",
      "agricultural",
      documentHash,
      1000,
      "Rural Area",
      boundaries
    );
    contract.caller = "ST3FAKE";
    const result = contract.updateParcel(0, "ST3NEW", "New metadata");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets registration fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setRegistrationFee(10000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.registrationFee).toBe(10000);
    const geolocHash = new Uint8Array(32).fill(1);
    const documentHash = new Uint8Array(32).fill(2);
    const boundaries = [{ lat: 10, lon: 20 }, { lat: 30, lon: 40 }, { lat: 50, lon: 60 }];
    contract.registerParcel(
      geolocHash,
      "Parcel metadata",
      "agricultural",
      documentHash,
      1000,
      "Rural Area",
      boundaries
    );
    expect(contract.stxTransfers).toEqual([{ amount: 10000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects registration fee change without authority contract", () => {
    const result = contract.setRegistrationFee(10000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct parcel count", () => {
    contract.setAuthorityContract("ST2TEST");
    const geolocHash1 = new Uint8Array(32).fill(1);
    const geolocHash2 = new Uint8Array(32).fill(3);
    const documentHash = new Uint8Array(32).fill(2);
    const boundaries = [{ lat: 10, lon: 20 }, { lat: 30, lon: 40 }, { lat: 50, lon: 60 }];
    contract.registerParcel(
      geolocHash1,
      "Parcel1",
      "agricultural",
      documentHash,
      1000,
      "Area1",
      boundaries
    );
    contract.registerParcel(
      geolocHash2,
      "Parcel2",
      "residential",
      documentHash,
      2000,
      "Area2",
      boundaries
    );
    const result = contract.getParcelCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks parcel existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    const geolocHash = new Uint8Array(32).fill(1);
    const documentHash = new Uint8Array(32).fill(2);
    const boundaries = [{ lat: 10, lon: 20 }, { lat: 30, lon: 40 }, { lat: 50, lon: 60 }];
    contract.registerParcel(
      geolocHash,
      "Parcel metadata",
      "agricultural",
      documentHash,
      1000,
      "Rural Area",
      boundaries
    );
    const result = contract.checkParcelExistence(geolocHash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const fakeHash = new Uint8Array(32).fill(4);
    const result2 = contract.checkParcelExistence(fakeHash);
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("rejects parcel registration with invalid boundaries", () => {
    contract.setAuthorityContract("ST2TEST");
    const geolocHash = new Uint8Array(32).fill(1);
    const documentHash = new Uint8Array(32).fill(2);
    const boundaries = [{ lat: 10, lon: 20 }, { lat: 30, lon: 40 }];
    const result = contract.registerParcel(
      geolocHash,
      "Parcel metadata",
      "agricultural",
      documentHash,
      1000,
      "Rural Area",
      boundaries
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_BOUNDARIES);
  });

  it("rejects parcel registration with max parcels exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxParcels = 1;
    const geolocHash1 = new Uint8Array(32).fill(1);
    const geolocHash2 = new Uint8Array(32).fill(3);
    const documentHash = new Uint8Array(32).fill(2);
    const boundaries = [{ lat: 10, lon: 20 }, { lat: 30, lon: 40 }, { lat: 50, lon: 60 }];
    contract.registerParcel(
      geolocHash1,
      "Parcel1",
      "agricultural",
      documentHash,
      1000,
      "Area1",
      boundaries
    );
    const result = contract.registerParcel(
      geolocHash2,
      "Parcel2",
      "residential",
      documentHash,
      2000,
      "Area2",
      boundaries
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_PARCELS_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});