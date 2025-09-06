import styles from '@/styles/CowProductThumbnails.module.css'; 


const CowProductListing = () => {
  return (
    <div>
      <h1>Our Cow Product Thumbnails (Spritesheet Method)</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailCowBrownWhite}`}></div>
          <p>Cow (Brown/White)</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailSausageLinks}`}></div>
          <p>Sausage Links</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailSteakTopRight}`}></div>
          <p>Steak (Top Right)</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailCowHeadBrown}`}></div>
          <p>Cow Head (Brown)</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailCowEye}`}></div>
          <p>Cow Eye</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailSkinnedCarcass}`}></div>
          <p>Skinned Carcass</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailCowTail}`}></div>
          <p>Cow Tail</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailCowBoneLong}`}></div>
          <p>Cow Bone (Long)</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailCowBrain}`}></div>
          <p>Cow Brain</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailCowTongue}`}></div>
          <p>Cow Tongue</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailCowBlackWhite}`}></div>
          <p>Cow (Black/White)</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailCowHidePatterned}`}></div>
          <p>Cow Hide (Patterned)</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailCowBladderContainer}`}></div>
          <p>Cow Bladder/Container</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailCowLegHoof}`}></div>
          <p>Cow Leg (Hoof)</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailCowBonesAssorted}`}></div>
          <p>Cow Bones (Assorted)</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailCowLungs}`}></div>
          <p>Cow Lungs</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailCowIntestines}`}></div>
          <p>Cow Intestines</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailBeefSteakRound}`}></div>
          <p>Beef Steak (Round)</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailRawhideSticks}`}></div>
          <p>Rawhide Sticks</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailSausagePieces}`}></div>
          <p>Sausage Pieces</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailCowLiver}`}></div>
          <p>Cow Liver</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailCowHeart}`}></div>
          <p>Cow Heart</p>
        </div>

      </div>
    </div>
  );
};

export default CowProductListing;