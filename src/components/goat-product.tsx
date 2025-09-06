
import styles from '@/styles/GoatProductThumbnails.module.css'; // Adjust path if needed

const ProductListing = () => {
  return (
    <div>
      <h1>Our Goat Product Thumbnails (Spritesheet Method - Updated Image)</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailWholeWhiteGoat}`}></div>
          <p>Whole White Goat</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailGoatCarcass}`}></div>
          <p>Goat Carcass</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailGoatLiver}`}></div>
          <p>Goat Liver</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailGoatLungs}`}></div>
          <p>Goat Lungs</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailGoatHeart}`}></div>
          <p>Goat Heart</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailGoatMeatSliceTopRight}`}></div>
          <p>Goat Meat Slice (Top Right)</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailGoatHead1}`}></div>
          <p>Goat Head 1</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailGoatHead2}`}></div>
          <p>Goat Head 2</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailGoatLegHock}`}></div>
          <p>Goat Leg/Hock</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailSkinnedGoat}`}></div>
          <p>Skinned Goat</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailGoatIntestines}`}></div>
          <p>Goat Intestines</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailGoatBonesTop}`}></div>
          <p>Goat Bones (Top)</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailGoatMeatSliceBottomLeft}`}></div>
          <p>Goat Meat Slice (Bottom Left)</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailGoatBladderGland}`}></div>
          <p>Goat Bladder/Gland</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailGoatSkinPiece}`}></div>
          <p>Goat Skin Piece</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailGoatTail}`}></div>
          <p>Goat Tail</p>
        </div>

        <div className={styles.thumbnailContainer}>
          <div className={`${styles.thumbnailImage} ${styles.thumbnailGoatBonesBottom}`}></div>
          <p>Goat Bones (Bottom)</p>
        </div>

      </div>
    </div>
  );
};

export default ProductListing;