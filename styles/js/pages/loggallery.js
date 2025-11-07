/* ==================================================================== */
/* Import Charadex
======================================================================= */
import { charadex } from '../charadex.js';


/* ==================================================================== */
/* Load
======================================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  let dex = await charadex.initialize.page(
    null,
    charadex.page.loggallery,
    null, 
    async (listData) => {
      // 현재 프로필 데이터 저장
      if (listData?.profileArray?.[0]) {
        window.charadexCurrentData = listData.profileArray[0];
      }
    }
  );

  charadex.tools.loadPage('.softload', 500);
});
