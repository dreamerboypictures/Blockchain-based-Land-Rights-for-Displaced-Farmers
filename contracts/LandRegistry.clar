(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-PARCEL-ID u101)
(define-constant ERR-INVALID-OWNER u102)
(define-constant ERR-INVALID-GEOLOC-HASH u103)
(define-constant ERR-INVALID-METADATA u104)
(define-constant ERR-PARCEL-ALREADY-EXISTS u105)
(define-constant ERR-PARCEL-NOT-FOUND u106)
(define-constant ERR-INVALID-TIMESTAMP u107)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u108)
(define-constant ERR-INVALID-SIZE u109)
(define-constant ERR-INVALID-LOCATION u110)
(define-constant ERR-INVALID-STATUS u111)
(define-constant ERR-UPDATE-NOT-ALLOWED u112)
(define-constant ERR-INVALID-UPDATE-PARAM u113)
(define-constant ERR-MAX-PARCELS-EXCEEDED u114)
(define-constant ERR-INVALID-PARCEL-TYPE u115)
(define-constant ERR-INVALID-DOCUMENT-HASH u116)
(define-constant ERR-INVALID-VERIFIER u117)
(define-constant ERR-REGISTRATION-FEE-NOT-PAID u118)
(define-constant ERR-INVALID-CURRENCY u119)
(define-constant ERR-INVALID-BOUNDARIES u120)

(define-data-var next-parcel-id uint u0)
(define-data-var max-parcels uint u100000)
(define-data-var registration-fee uint u5000)
(define-data-var authority-contract (optional principal) none)

(define-map parcels
  uint
  {
    owner: principal,
    geoloc-hash: (buff 32),
    metadata: (string-utf8 256),
    timestamp: uint,
    parcel-type: (string-utf8 50),
    document-hash: (buff 32),
    size: uint,
    location: (string-utf8 100),
    status: bool,
    boundaries: (list 10 (tuple (lat int) (lon int)))
  }
)

(define-map parcels-by-geoloc
  (buff 32)
  uint)

(define-map parcel-updates
  uint
  {
    update-owner: principal,
    update-metadata: (string-utf8 256),
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-parcel (id uint))
  (map-get? parcels id)
)

(define-read-only (get-parcel-updates (id uint))
  (map-get? parcel-updates id)
)

(define-read-only (is-parcel-registered (geoloc (buff 32)))
  (is-some (map-get? parcels-by-geoloc geoloc))
)

(define-private (validate-owner (owner principal))
  (if (not (is-eq owner 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-INVALID-OWNER))
)

(define-private (validate-geoloc-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-GEOLOC-HASH))
)

(define-private (validate-metadata (meta (string-utf8 256)))
  (if (<= (len meta) u256)
      (ok true)
      (err ERR-INVALID-METADATA))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-parcel-type (ptype (string-utf8 50)))
  (if (or (is-eq ptype "agricultural") (is-eq ptype "residential") (is-eq ptype "commercial"))
      (ok true)
      (err ERR-INVALID-PARCEL-TYPE))
)

(define-private (validate-document-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-DOCUMENT-HASH))
)

(define-private (validate-size (sz uint))
  (if (> sz u0)
      (ok true)
      (err ERR-INVALID-SIZE))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-boundaries (bounds (list 10 (tuple (lat int) (lon int)))))
  (if (>= (len bounds) u3)
      (ok true)
      (err ERR-INVALID-BOUNDARIES))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-owner contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-parcels (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-MAX-PARCELS-EXCEEDED))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-parcels new-max)
    (ok true)
  )
)

(define-public (set-registration-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set registration-fee new-fee)
    (ok true)
  )
)

(define-public (register-parcel
  (geoloc-hash (buff 32))
  (metadata (string-utf8 256))
  (parcel-type (string-utf8 50))
  (document-hash (buff 32))
  (size uint)
  (location (string-utf8 100))
  (boundaries (list 10 (tuple (lat int) (lon int))))
)
  (let (
        (next-id (var-get next-parcel-id))
        (current-max (var-get max-parcels))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-PARCELS-EXCEEDED))
    (try! (validate-geoloc-hash geoloc-hash))
    (try! (validate-metadata metadata))
    (try! (validate-parcel-type parcel-type))
    (try! (validate-document-hash document-hash))
    (try! (validate-size size))
    (try! (validate-location location))
    (try! (validate-boundaries boundaries))
    (asserts! (is-none (map-get? parcels-by-geoloc geoloc-hash)) (err ERR-PARCEL-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get registration-fee) tx-sender authority-recipient))
    )
    (map-set parcels next-id
      {
        owner: tx-sender,
        geoloc-hash: geoloc-hash,
        metadata: metadata,
        timestamp: block-height,
        parcel-type: parcel-type,
        document-hash: document-hash,
        size: size,
        location: location,
        status: true,
        boundaries: boundaries
      }
    )
    (map-set parcels-by-geoloc geoloc-hash next-id)
    (var-set next-parcel-id (+ next-id u1))
    (print { event: "parcel-registered", id: next-id })
    (ok next-id)
  )
)

(define-public (update-parcel
  (parcel-id uint)
  (update-owner principal)
  (update-metadata (string-utf8 256))
)
  (let ((parcel (map-get? parcels parcel-id)))
    (match parcel
      p
        (begin
          (asserts! (is-eq (get owner p) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-owner update-owner))
          (try! (validate-metadata update-metadata))
          (map-set parcels parcel-id
            {
              owner: update-owner,
              geoloc-hash: (get geoloc-hash p),
              metadata: update-metadata,
              timestamp: block-height,
              parcel-type: (get parcel-type p),
              document-hash: (get document-hash p),
              size: (get size p),
              location: (get location p),
              status: (get status p),
              boundaries: (get boundaries p)
            }
          )
          (map-set parcel-updates parcel-id
            {
              update-owner: update-owner,
              update-metadata: update-metadata,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "parcel-updated", id: parcel-id })
          (ok true)
        )
      (err ERR-PARCEL-NOT-FOUND)
    )
  )
)

(define-public (get-parcel-count)
  (ok (var-get next-parcel-id))
)

(define-public (check-parcel-existence (geoloc (buff 32)))
  (ok (is-parcel-registered geoloc))
)