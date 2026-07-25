# State Secretary of State (SoS) Business-Entity Data — Phase 1 Feasibility Census

**Status:** Research only. No connectors have been built. Nothing in this document has been wired into the app.

## Methodology (read this before trusting any row)

For each of the 50 states + DC, this pass checked:

1. **`robots.txt`** at the search portal's domain — the most legally load-bearing, cheapest-to-verify signal. A `Disallow` covering the search path (or the whole site) puts a state in the blocked tier regardless of anything else.
2. **Live fetch of the portal itself**, for states where this surfaced a CAPTCHA challenge directly (confirmed for CA docs generally, ND, WY) or an active WAF block (`403 Forbidden` on a plain `robots.txt` request — a very unusual response for a static file, and strong evidence of bot-mitigation infrastructure like Incapsula/Akamai/Cloudflare intercepting non-browser clients).
3. **Terms of Use / ToS search**, done for a subset (confirmed for Delaware, attempted for Florida). This is the gap robots.txt can't cover — Delaware's `robots.txt` doesn't block anything, but its ToS explicitly prohibits "data mining" and automated tools and requires CAPTCHA. **This is exactly the kind of mismatch the brief warned about**, and it means the 23 states marked "Scrapable" below were cleared on robots.txt only, not on a full ToS read. Before any Phase 2 connector gets built against a "Scrapable" state, that state's actual ToS page should get the same scrutiny Delaware got here.
4. **Direct API-endpoint test**, done for Colorado (succeeded — real data returned) and searched for Washington (no public API found, despite a modern CCFS portal).

**What I did NOT do:** an exhaustive open-data-portal search for all 51 jurisdictions (only CO and WA were checked this deeply — there may be more API states I haven't found yet), or a full ToS read for every "Scrapable" state, or live CAPTCHA-presence checks beyond the handful noted. 8 states below have genuinely inconclusive results (fetch errors, redirects I didn't chase, or SPA shells with no static robots.txt) and are flagged `NEEDS VERIFICATION` rather than guessed.

## Counts

| Tier | Count | States |
|---|---|---|
| **API** (confirmed real, official, machine-readable) | 1 | Colorado |
| **Scrapable** (robots.txt permissive, no CAPTCHA/block found — ToS not yet individually verified) | 23 | AL, AZ, AR, CT, ID, IA, KY, ME, MD, MI, MS, NE, NJ, NM, NC, PA, RI, SC, SD, TX*, WA, WV, WI |
| **Blocked** (robots.txt disallow, CAPTCHA, WAF 403, or explicit ToS prohibition) | 19 | AK, CA, DE, DC, FL, GA, IL, KS, LA, MA, MO, MT, ND, NH, OH, OK, UT, VA, WY |
| **Needs verification** (inconclusive this pass) | 8 | HI, IN, MN, NV, NY, OR, TN, VT |

\* Texas is flagged separately below — the URL commonly listed is the Comptroller's taxable-entity search, not the actual SOS filings registry.

## Full Table

| State | Portal URL | Query Method | Tier | Evidence / Confidence |
|---|---|---|---|---|
| Alabama | https://www.sos.alabama.gov/government-records/business-entity-records | Web form | Scrapable | robots.txt permissive (Drupal boilerplate; entity-records path not disallowed). CAPTCHA presence not directly checked. |
| Alaska | https://www.commerce.alaska.gov/cbp/main/search/entities | Web form | Blocked | robots.txt fetch itself returned `403 Forbidden` — strong WAF/bot-mitigation signal. |
| Arizona | https://arizonabusinesscenter.azcc.gov/businesssearch | Web form | Scrapable | robots.txt: no file found (404) = default allow. CAPTCHA not directly checked. |
| Arkansas | https://www.ark.org/corp-search/index.php | Web form | Scrapable | robots.txt permissive; corp-search path not in the disallow list. |
| California | https://bizfileonline.sos.ca.gov/search/business | Web form (SPA) | Blocked | robots.txt fetch was inconclusive (SPA shell, no clean static file). Widely documented to require CAPTCHA on search — **not independently re-verified this session**; recommend confirming directly before finalizing. |
| Colorado | https://data.colorado.gov/resource/4ykn-tg5h.json | **Official Socrata API** | **API** | **Confirmed live**: fetched `data.colorado.gov/resource/4ykn-tg5h.json?$limit=1` and got real structured JSON — `entityname`, `entitystatus`, `entitytype`, `agentfirstname`/`agentlastname` (registered agent), `entityformdate` (filing date). This is the "Business Entities in Colorado" official state dataset, not a third-party scrape. |
| Connecticut | https://service.ct.gov/business/s/onlinebusinesssearch | Web form (Salesforce) | Scrapable | robots.txt blanket-disallows the site except explicit `Allow: /business/s` — the search path is a sub-path of that allowed prefix. |
| Delaware | https://icis.corp.delaware.gov/Ecorp/EntitySearch/NameSearch.aspx | Web form | **Blocked** | robots.txt itself has no file (404), but **ToS explicitly prohibits data mining and automated search tools**, warns of access suspension for high-volume querying, and may require CAPTCHA. No public API or bulk data offered. Classic robots.txt/ToS mismatch — confirmed via direct ToS search, not assumed. |
| DC | https://corponline.dlcp.dc.gov/business/businesssearch | Web form | Blocked | robots.txt: blanket `Disallow: /`, no exceptions. |
| Florida | http://search.sunbiz.org/Inquiry/CorporationSearch/ByName | Web form | Blocked | robots.txt fetch returned `403 Forbidden` (WAF block on a plain static file — strong technical signal, consistent with known Incapsula/Imperva usage on this domain). Explicit ToS text not independently located this session; recommend confirming before final legal sign-off. |
| Georgia | https://ecorp.sos.ga.gov/BusinessSearch | Web form | Blocked | robots.txt fetch returned `403 Forbidden`. |
| Hawaii | https://hbe.ehawaii.gov/documents/search.html | Web form | **Needs verification** | URL redirects to `hbe.dcca.hawaii.gov`; robots.txt not checked at the resolved domain. |
| Idaho | https://sosbiz.idaho.gov/search/business | Web form | Scrapable | robots.txt only disallows one unrelated image-report API path; search path open. |
| Illinois | https://apps.ilsos.gov/corporatellc/ | Web form | Blocked | robots.txt fetch returned `403 Forbidden`. |
| Indiana | https://bsd.sos.in.gov/publicbusinesssearch | Web form | **Needs verification** | robots.txt fetch returned no usable content (not a clean 403/404); inconclusive. |
| Iowa | https://sos.iowa.gov/search/business/search.aspx | Web form | Scrapable | robots.txt permissive (blocks AI-training crawlers by user-agent — ClaudeBot, GPTBot, etc. — but allows general `search=yes` access; business-search path not disallowed). |
| Kansas | https://www.sos.ks.gov/eforms/BusinessEntity/Search.aspx | Web form | **Blocked** | robots.txt **explicitly disallows this exact path**: `/eforms/BusinessEntity/Search.aspx`. |
| Kentucky | https://sosbes.sos.ky.gov/BusSearchNProfile/search.aspx | Web form | Scrapable | robots.txt: no file found (404) = default allow. |
| Louisiana | https://coraweb.sos.la.gov/CommercialSearch/CommercialSearch.aspx | Web form | **Blocked** | robots.txt **explicitly disallows the main search page** (`/commercialsearch/CommercialSearch.aspx`) and all query-string URLs (`/*?*`), which would block parameterized search requests generally. |
| Maine | https://apps3.web.maine.gov/nei-sos-icrs/ICRS?MainPage=x | Web form | Scrapable | robots.txt is large (77 rules) but none reference `/nei-sos-icrs/` or ICRS. |
| Maryland | https://egov.maryland.gov/BusinessExpress/EntitySearch | Web form | Scrapable | robots.txt: blanket disallow **except an explicit `Allow: /businessexpress/entitysearch`** — the target path is named directly as an exception. |
| Massachusetts | https://corp.sec.state.ma.us/corpweb/CorpSearch/CorpSearch.aspx | Web form | Blocked | robots.txt: blanket `Disallow: /`, no exceptions. |
| Michigan | https://mibusinessregistry.lara.state.mi.us/search/business | Web form | Scrapable | robots.txt permissive (blocks AI-training crawlers by user-agent only; general search allowed). |
| Minnesota | https://mblsportal.sos.state.mn.us/Business/Search | Web form | **Needs verification** | Domain redirects to `mblsportal.sos.mn.gov`; robots.txt not re-checked at the resolved host. |
| Mississippi | https://corp.sos.ms.gov/corp/portal/c/page/corpBusinessIdSearch/portal.aspx | Web form | Scrapable | robots.txt: no file found (404) = default allow. |
| Missouri | https://bsd.sos.mo.gov/BusinessEntity/BESearch.aspx | Web form | Blocked | robots.txt fetch returned `403 Forbidden`. |
| Montana | https://biz.sosmt.gov/search/business | Web form | Blocked | robots.txt fetch returned `403 Forbidden`. |
| Nebraska | https://www.nebraska.gov/sos/corp/corpsearch.cgi | Web form | Scrapable | robots.txt permissive; `/sos/corp/` path explicitly not in the (short) disallow list. |
| Nevada | https://esos.nv.gov/EntitySearch/OnlineEntitySearch | Web form | **Needs verification** | robots.txt fetch returned no usable content; inconclusive. |
| New Hampshire | https://quickstart.sos.nh.gov/online/BusinessInquire | Web form | Blocked | robots.txt fetch returned `403 Forbidden`. |
| New Jersey | https://www.njportal.com/DOR/BusinessNameSearch/Search/BusinessName | Web form | Scrapable | robots.txt path itself returns 404 (no file) = default allow. Low confidence — fetch tooling had trouble distinguishing the 404 page from file content; worth a manual re-check. |
| New Mexico | https://enterprise.sos.nm.gov/search/business | Web form | Scrapable | robots.txt: no file found (404) = default allow. |
| New York | https://apps.dos.ny.gov/publicInquiry/ | Web form | **Needs verification** | robots.txt fetch failed with a connection reset twice; inconclusive — could indicate rate-limiting/blocking of non-browser clients, or just transient failure. Needs a clean re-check. |
| North Carolina | https://www.sosnc.gov/online_services/search/by_title/_Business_Registration | Web form | Scrapable | robots.txt: no file found (404) = default allow. |
| North Dakota | https://firststop.sos.nd.gov/search/business | Web form | **Blocked** | Direct fetch of the portal **returned an active CAPTCHA challenge screen** (image-selection + audio challenge) instead of page content — confirmed, not inferred. |
| Ohio | https://businesssearch.ohiosos.gov/ | Web form | Blocked | robots.txt fetch returned `403 Forbidden`. |
| Oklahoma | https://www.sos.ok.gov/corp/corpinquiryfind.aspx | Web form | Blocked | robots.txt: blanket `Disallow: /` plus an explicit second rule specifically blocking the corp inquiry page. |
| Oregon | ~~http://egov.sos.state.or.us/br/pkg_web_name_srch_inq.login~~ → https://sos.oregon.gov/business/pages/temp-business-search.aspx | Web form | **Needs verification** | The old URL is dead (redirects to a 404). Found the current URL via search — note its path is literally named "temp-business-search," suggesting an interim system. robots.txt not yet checked at the new host. |
| Pennsylvania | https://file.dos.pa.gov/search/business | Web form | Scrapable | robots.txt permissive (blocks AI-training crawlers by user-agent only; general search allowed). |
| Rhode Island | http://business.sos.ri.gov/CorpWeb/CorpSearch/CorpSearch.aspx | Web form | Scrapable | robots.txt: no file found (404) = default allow. |
| South Carolina | https://businessfilings.sc.gov/BusinessFiling/Entity/Search | Web form | Scrapable | robots.txt: no file found (404) = default allow. |
| South Dakota | https://sosenterprise.sd.gov/BusinessServices/Business/FilingSearch.aspx | Web form | Scrapable | robots.txt: no file found (404) = default allow. |
| Tennessee | https://tncab.tnsos.gov/business-entity-search | Web form | **Needs verification** | robots.txt returned 404 at this subdomain; didn't check the `tnsos.gov` root. Inconclusive. |
| Texas | https://mycpa.cpa.state.tx.us/coa/ | Web form | Scrapable (data-limited) | robots.txt: no file (404) = default allow. **Caveat: this is the Comptroller's taxable-entity search, not the actual SOS filings registry** — Texas's real business-entity registry (SOSDirect) is a paid subscription service with no free public search. This connector would return tax/franchise status, not registered-agent/filing-date data in our target shape. |
| Utah | https://businessregistration.utah.gov/EntitySearch/OnlineEntitySearch | Web form | Blocked | robots.txt fetch returned `403 Forbidden`. |
| Vermont | https://bizfilings.vermont.gov/business/businesssearch | Web form | **Needs verification** | robots.txt fetch returned an ambiguous result (page heading only, no file content confirmed). Needs a clean re-check. |
| Virginia | https://cis.scc.virginia.gov/EntitySearch/Index | Web form | Blocked | robots.txt: blanket `Disallow: /`, with the *only* exception being SiteimproveBot (an accessibility-auditing crawler, not general-purpose). |
| Washington | https://ccfs.sos.wa.gov/#/AdvancedSearch | Web form | Scrapable | robots.txt: no file found (404) = default allow. Searched for an official open-data API (`data.wa.gov`) — none found; CCFS offers CSV export from the UI but no documented public API. |
| West Virginia | https://apps.wv.gov/SOS/BusinessEntitySearch/ | Web form | Scrapable | robots.txt explicitly shows `/SOS/` as an allowed path; `/SOS/BusinessEntitySearch/` falls under it. |
| Wisconsin | https://apps.dfi.wi.gov/apps/corpsearch/search.aspx | Web form | Scrapable | robots.txt: no file found (404) = default allow. |
| Wyoming | https://wyobiz.wyo.gov/Business/FilingSearch.aspx | Web form | **Blocked** | Direct fetch of `robots.txt` itself **returned an active CAPTCHA challenge page**, not the file — confirmed, not inferred. WAF intercepts even trivial static-file requests. |

## Flags for your review

- **Only Colorado is a confirmed real API.** Everything else that isn't blocked is "scrapable" in the narrow sense of "no technical block found on a plain form-search page" — that's a much weaker guarantee than an API and is exactly the tier the brief said needs the most care.
- **The Delaware case is the reason robots.txt can't be the only check.** 22 of the 23 "Scrapable" states were cleared on robots.txt alone; none got the ToS read Delaware got. Recommend giving each one that same check before its connector is actually built in Phase 2, not building all 23 on today's evidence.
- **8 states are genuinely unresolved** (HI, IN, MN, NV, NY, OR, TN, VT) — fetch errors or redirects I didn't chase down. These need a clean re-check before they're assigned a tier at all; I did not want to guess and mark them "scrapable" on absence of evidence.
- **California, Florida** are marked Blocked on strong circumstantial/technical evidence (known CAPTCHA requirement for CA; WAF 403 on Florida's robots.txt) but neither got an independent ToS-text read this session — worth a final confirmation pass, though I'd be surprised if either flips.
- **Texas's listed URL is the wrong tool for our data shape** — flagged above, not a full SOS registry.
- This is an automated research pass, not a legal opinion. Before building against any "Scrapable" state, a human (ideally with legal input) should do a final ToS read — Delaware proves that step catches real, non-obvious problems.
