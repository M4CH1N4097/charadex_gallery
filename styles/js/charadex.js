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

/* 글/그림 분리 - 시트 값 기준으로 강제 토글 (갤러리/프로필 공통) */
document.addEventListener('DOMContentLoaded', () => {
  const getSheetOpt = (k) => (charadex?.sheet?.options?.[k] || '').trim();

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

  // 규칙 1) 갤러리: 유형 무관, 항상 이미지 썸네일
  const applyGalleryRule = (root=document) => {
    root.querySelectorAll('#charadex-gallery .cd-loggallery-card img.image').forEach(img => {
      if (img.getAttribute('src') && img.getAttribute('src').trim() !== '') {
        img.style.display = 'block';
      }
    });
  };

  // 규칙 2) 프로필: 글이면 iframe(텍스트 링크 임베드), 아니면 이미지
  const applyProfileRule = (root=document) => {
    const workType  = getSheetOpt('data-type');   // '글' / 기타
    const textlink0 = getSheetOpt('Textlink');    // 글 문서 링크
    const containers = root.querySelectorAll('#charadex-profile .cd-loggallery-image-container');

    containers.forEach(box => {
      const iframe = box.querySelector('iframe');
      const img    = box.querySelector('img');

      // 안전하게 초기화
      if (iframe) { iframe.style.display = 'none'; }
      if (img)    { img.style.display    = 'none'; }

      if (workType === '글') {
        // 글: iframe만 보이기 (Textlink를 임베드로 변환)
        if (iframe) {
          const embedded = toEmbedded(textlink0);
          iframe.src = embedded || '';
          iframe.style.display = embedded ? 'block' : 'none';
          iframe.style.width = '80%';
          iframe.style.height = '80vh'; // 가시성↑
          iframe.style.border = '0';
        }
        if (img) {
          img.style.display = 'none';
          // 필요 시 완전히 차단하고 싶으면 다음 줄 주석 해제
          // img.removeAttribute('src');
        }
      } else {
        // 글이 아님: 이미지 표시, iframe 비활성화
        if (iframe) { iframe.removeAttribute('src'); iframe.style.display = 'none'; }
        if (img && img.getAttribute('src') && img.getAttribute('src').trim() !== '') {
          img.style.display = 'block';
        }
      }
    });
  };

  // 최초 1회 적용
  applyGalleryRule(document);
  applyProfileRule(document);

  // 렌더 지연/교체에 대응: DOM 변경 감시
  const target = document.querySelector('#main-container') || document.body;
  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach(node => {
        if (!(node instanceof HTMLElement)) return;
        // 갤러리 아이템이 추가되면 즉시 썸네일 강제 노출
        if (node.matches && node.matches('#charadex-gallery .cd-loggallery-card, #charadex-gallery .charadex-list, #charadex-gallery')) {
          applyGalleryRule(node);
        }
        // 프로필 블록이 추가되면 규칙 적용
        if (node.id === 'charadex-profile' || node.querySelector?.('#charadex-profile')) {
          applyProfileRule(node);
        }
      });
    }
  });
  obs.observe(target, { childList: true, subtree: true });
});

export { charadex };

