/* ==================================================================== */
/* Import Charadex
/* ==================================================================== */
import { charadex } from './list.js';

/* ==================================================================== */
/* Initialize
/* ==================================================================== */
/* This is where the real magic happens
/* ==================================================================== */
charadex.initialize = {};


/* ==================================================================== */
/* Page
/* ==================================================================== */
charadex.initialize.page = async (dataArr, config, dataCallback, listCallback, customPageUrl = false) => {

  if (!config) return console.error('No configuration added.');

  // Set up
  let selector = config.dexSelector;
  let pageUrl = customPageUrl || charadex.url.getPageUrl(config.sitePage);

  // Add folders, filters & search
  let folders = config.fauxFolder?.toggle ?? false ? charadex.listFeatures.fauxFolders(pageUrl, config.fauxFolder.parameters, selector) : false;
  let filters = config.filters?.toggle ?? false ? charadex.listFeatures.filters(config.filters.parameters, selector) : false;
  let search = config.search?.toggle ?? false ? charadex.listFeatures.search(config.search.parameters, config.search.filterToggle, selector) : false;

  // Get our data
  let charadexData = dataArr || await charadex.importSheet(config.sheetPage);

  // Add profile information
  for (let entry of charadexData) {
    charadex.tools.addProfileLinks(entry, pageUrl, config.profileProperty); // Go ahead and add profile keys just in case
    if (folders) folders(entry, config.fauxFolder.folderProperty); // If folders, add folder info
    if (entry.등급) entry.raritybadge = `<span class="badge badge-${charadex.tools.scrub(entry.등급)}">${entry.등급}</span>`; // Adds a rarity badge
  }

  // If there's related data, add it
  if (config.relatedData) {
    for (let page in config.relatedData) {
      await charadex.manageData.relateData(
        charadexData, 
        config.relatedData[page].primaryProperty, 
        page, 
        config.relatedData[page].relatedProperty
      );
    }
  }

  // Initialize the list
  let list = charadex.buildList(selector);

  // Let us manipulate the data before it gets to the list
  if (typeof dataCallback === 'function') {
    await dataCallback(charadexData);
  }

  /* Sort the Dex */
  if (config.sort?.toggle ?? false) {
    charadexData = charadex.manageData.sortArray(
      charadexData, 
      config.sort.sortProperty, 
      config.sort.order,
      config.sort.parametersKey,
      config.sort.parameters,
    );
  }

  // Create Profile
  const createProfile = async () => {

    // If they dont need to render a profile, don't
    if (config.profileToggle !== undefined && !config.profileToggle) return false;

    let profileArr = list.getProfile(charadexData);
    if (!profileArr) return false;

    if (config.prevNext?.toggle ?? false) {
      charadex.listFeatures.prevNextLink(pageUrl, charadexData, profileArr, selector);
    }
    
    /* Create Profile */
    let profileList = list.initializeProfile(profileArr);

    // Return those values on Callback
    if (typeof listCallback === 'function') {
      await listCallback({
        type: 'profile',
        pageUrl: pageUrl,
        array: charadexData,
        profileArray: profileArr,
        list: profileList
      })
    }

    return true;

  }

  // If there's a profile, nyoom
  if (await createProfile()) return;

  // Create Gallery
  const createGallery = async () => {

    // Add additional list junk
    let additionalListConfigs = {};

    // Filter by parameters
    charadexData = charadex.manageData.filterByPageParameters(charadexData);

    // Add Pagination
    if (config.pagination?.toggle ?? false) {
      let pagination = charadex.listFeatures.pagination(charadexData.length, config.pagination.amount, config.pagination.bottomToggle, selector);
      if (pagination) additionalListConfigs = { ...additionalListConfigs, ...pagination };
    }

    // Initialize Gallery
    let galleryList = list.initializeGallery(charadexData, additionalListConfigs);

    // Initialize filters and search
    if ((config.filters?.toggle ?? false) && filters) filters.initializeFilters(galleryList);
    if ((config.search?.toggle ?? false) && search) search.initializeSearch(galleryList);

    // Return those values on Callback
    if (typeof listCallback === 'function') {
      await listCallback({
        type: 'gallery',
        pageUrl: pageUrl,
        array: charadexData,
        list: galleryList,
      })
    }

    return true;

  }

  // Else the gallery nyooms instead
  return await createGallery();

}


/* ==================================================================== */
/* Grouped Gallery (Mostly for inventory items)
/* ==================================================================== */
charadex.initialize.groupGallery = async function (config, dataArray, groupBy, customPageUrl = false) {

  /* Check the Configs */
  if (!config) return console.error(`No config added.`);
  
  /* Get some stuff we'll need */
  let selector = config.dexSelector;
  const pageUrl = customPageUrl || charadex.url.getPageUrl(config.sitePage);

  // Add filters & Search
  let filters = config.filters?.toggle ?? false ? charadex.listFeatures.filters(config.filters.parameters, selector) : false;
  let search = config.search?.toggle ?? false ? charadex.listFeatures.search(config.search.parameters, config.search.filterToggle, selector) : false;

  /* Attempt to Fetch the data */
  let charadexData = dataArray;

  // Add profile information
  for (let entry of charadexData) {
    charadex.tools.addProfileLinks(entry, pageUrl, config.profileProperty);
  }

  /* Sort the Dex */
  if (config.sort?.toggle ?? false) {
    charadexData = charadex.manageData.sortArray(
      charadexData, 
      config.sort.sortProperty, 
      config.sort.order,
      config.sort.parametersKey,
      config.sort.parameters,
    );
  }

  /* Attempt deal with gallery
  ======================================================================= */
  const handleGallery = () => {

    if (!charadex.tools.checkArray(charadexData)) return false;

    // Filter by parameters
    charadexData = charadex.manageData.filterByPageParameters(charadexData);

    // Group data
    let groupArray = Object.groupBy(charadexData, obj => obj[groupBy]);

    // Create base selectors
    let itemSelector =  { item: `${selector}-gallery-item` };
    let containerSelector =  `${selector}-gallery`;

    for (let group in groupArray) {

      //Create the list selector
      let groupListSelector = charadex.tools.scrub(group);
      
      // Create the DOM elements
      let groupElement = $(`#${selector}-group-list`).clone();
      groupElement.removeAttr('id');
      groupElement.find(`.${selector}-list`).addClass(`${groupListSelector}-list`);
      groupElement.find(`.${selector}-group-title`).text(group);
      $(`#${selector}-group`).append(groupElement);
      
      // Build list based on group
      let groupListManager = charadex.buildList(groupListSelector);
      let groupList = groupListManager.initializeGallery(groupArray[group], itemSelector, containerSelector);

      // Add filters & Search
      if ((config.filters?.toggle ?? false) && filters) filters.initializeFilters(groupList);
      if ((config.search?.toggle ?? false) && search) search.initializeSearch(groupList);

    }

    return true;

  };

  return handleGallery();

};

/* 글/그림 분리 - 갤러리/프로필 표시 규칙 안정화 */
document.addEventListener('DOMContentLoaded', () => {
  // 시트 옵션(있으면 사용)
  const workTypeOpt  = (charadex?.sheet?.options?.['data-type'] || '').trim();
  const textlinkOpt  = (charadex?.sheet?.options?.Textlink || '').trim();

  const toEmbedded = (url) => {
    if (!url) return '';
    try {
      const u = new URL(url, location.origin);
      if (u.hostname.includes('docs.google.com')) {
        if (!u.searchParams.has('embedded')) u.searchParams.set('embedded','true');
      }
      return u.toString();
    } catch { return url; }
  };

  /* 규칙 1) 갤러리: 유형 무관, 항상 이미지 썸네일 노출 */
  const applyGallery = (root=document) => {
    root.querySelectorAll('#charadex-gallery .cd-loggallery-card img.image')
      .forEach(img => {
        if (img.src && img.src.trim() !== '') img.style.display = 'block';
      });
  };

  /* 규칙 2) 프로필: 
     - data-type이 '글'이면 iframe만 (Textlink 임베드), 이미지 숨김
     - 그 외엔 이미지만, iframe 숨김
     - 시트 옵션이 있으면 우선 사용, 없으면 컨테이너의 data-type 사용 */
  const applyProfile = (root=document) => {
    root.querySelectorAll('#charadex-profile .cd-loggallery-image-container')
      .forEach(box => {
        const iframe = box.querySelector('iframe');
        const img    = box.querySelector('img');
        const typeFromAttr = (box.getAttribute('data-type') || '').trim();
        const isTextType   = (workTypeOpt || typeFromAttr) === '글';

        // 기본 숨김
        if (iframe) iframe.style.display = 'none';
        if (img)    img.style.display = 'none';

        if (isTextType) {
          if (iframe) {
            const url = toEmbedded(textlinkOpt);
            // Textlink가 있으면 설정해서 보이기
            if (url) iframe.src = url;
            iframe.style.display = url ? 'block' : 'none';
            iframe.setAttribute('width','80%');
            iframe.setAttribute('height','80%');
            iframe.style.border = '0';
          }
          if (img) {
            // 글 타입에선 이미지 비노출
            img.style.display = 'none';
          }
        } else {
          // 글이 아닌 타입: 이미지 우선 노출
          if (iframe) { iframe.removeAttribute('src'); iframe.style.display = 'none'; }
          if (img && img.src && img.src.trim() !== '') {
            img.style.display = 'block';
          }
        }
      });
  };

  // 최초 1회
  applyGallery(document);
  applyProfile(document);

  // 변화에 재적용 (동적 로딩 대응)
  const target = document.body;
  const observer = new MutationObserver((mutations) => {
    let needGallery = false;
    let needProfile = false;

    for (const m of mutations) {
      // 노드 추가/제거로 구조가 바뀐 경우
      if (m.type === 'childList') {
        m.addedNodes.forEach(node => {
          if (!(node instanceof HTMLElement)) return;
          if (node.closest?.('#charadex-gallery') || node.matches?.('#charadex-gallery')) needGallery = true;
          if (node.closest?.('#charadex-profile') || node.matches?.('#charadex-profile')) needProfile = true;
        });
      }
      // img의 src가 바뀌는 경우
      if (m.type === 'attributes' && m.attributeName === 'src') {
        const el = m.target;
        if (el instanceof HTMLImageElement) {
          if (el.closest('#charadex-gallery')) needGallery = true;
          if (el.closest('#charadex-profile')) needProfile = true;
        }
      }
    }

    if (needGallery) applyGallery(document);
    if (needProfile) applyProfile(document);
  });

  observer.observe(target, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src']
  });
});



export { charadex };

