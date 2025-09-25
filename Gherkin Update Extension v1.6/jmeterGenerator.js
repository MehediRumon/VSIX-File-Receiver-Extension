// import { generateJMeterHttpSampler, wrapInJmx, downloadFile } from './jmeterGenerator.js';

// Helper: Escape XML for request bodies/params
function escapeXml(unsafe) {
    return unsafe
      ? unsafe.replace(/[<>&'"]/g, function (c) {
          switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
          }
        })
      : '';
}

// Generate a single JMeter HTTP Sampler (request)
export function generateJMeterHttpSampler({ method, url, headers, body }, samplerName = "API Request") {
    // Generate headers block
    let headerManager = '';
    if (headers && Object.keys(headers).length > 0) {
        headerManager = `
<HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="HTTP Header Manager" enabled="true">
  <collectionProp name="HeaderManager.headers">
    ${Object.entries(headers).map(([name, value]) => `
    <elementProp name="${name}" elementType="Header">
      <stringProp name="Header.name">${name}</stringProp>
      <stringProp name="Header.value">${value}</stringProp>
    </elementProp>`).join('')}
  </collectionProp>
</HeaderManager>`;
    }

    // If body present, add postBodyRaw and postBody fields
    let hasBody = body && body.trim().length > 0;
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch (e) {
        parsedUrl = { pathname: url };
    }

    return `
<HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="${samplerName}" enabled="true">
  <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
    <collectionProp name="Arguments.arguments"/>
  </elementProp>
  <stringProp name="HTTPSampler.domain">${parsedUrl.hostname || ""}</stringProp>
  <stringProp name="HTTPSampler.port">${parsedUrl.port || ""}</stringProp>
  <stringProp name="HTTPSampler.protocol">${parsedUrl.protocol ? parsedUrl.protocol.replace(':', '') : ""}</stringProp>
  <stringProp name="HTTPSampler.contentEncoding"></stringProp>
  <stringProp name="HTTPSampler.path">${parsedUrl.pathname || ""}</stringProp>
  <stringProp name="HTTPSampler.method">${method || "GET"}</stringProp>
  <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
  <boolProp name="HTTPSampler.auto_redirects">false</boolProp>
  <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
  <boolProp name="HTTPSampler.DO_MULTIPART_POST">false</boolProp>
  <stringProp name="HTTPSampler.embedded_url_re"></stringProp>
  <stringProp name="HTTPSampler.connect_timeout"></stringProp>
  <stringProp name="HTTPSampler.response_timeout"></stringProp>
  ${hasBody
    ? `<stringProp name="HTTPSampler.postBodyRaw">true</stringProp>
  <elementProp name="HTTPsampler.Files" elementType="HTTPFileArgs">
    <collectionProp name="HTTPFileArgs.files"/>
  </elementProp>
  <stringProp name="HTTPSampler.postBody">${escapeXml(body)}</stringProp>`
    : ''}
</HTTPSamplerProxy>
${headerManager}
`;
}

// Main JMX wrapper: groups all samplers in a Simple Controller and adds assertion+configs+listeners
export function wrapInJmx(samplers) {
    // For each sampler, add an assertion and place in Simple Controller
    const samplerWithHashTrees = samplers.map(s =>
      `${s}
      <hashTree>
        <ResponseAssertion guiclass="AssertionGui" testclass="ResponseAssertion" testname="Response Assertion" enabled="true">
          <collectionProp name="Asserion.test_strings">
            <stringProp name="601">200</stringProp>
          </collectionProp>
          <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
          <boolProp name="Assertion.assume_success">false</boolProp>
          <intProp name="Assertion.test_type">2</intProp>
        </ResponseAssertion>
        <hashTree/>
      </hashTree>`
    ).join('\n');

    // JMX plan with CSV, Cookie Manager, Listeners, and a Simple Controller for all HTTP requests
    return `<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.5">
<hashTree>
  <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="Test Plan" enabled="true">
    <stringProp name="TestPlan.comments"></stringProp>
    <boolProp name="TestPlan.functional_mode">false</boolProp>
    <boolProp name="TestPlan.tearDown_on_shutdown">true</boolProp>
    <elementProp name="TestPlan.user_defined_variables" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" enabled="true">
      <collectionProp name="Arguments.arguments"/>
    </elementProp>
    <stringProp name="TestPlan.serialize_threadgroups">false</stringProp>
  </TestPlan>
  <hashTree>
    <!-- Thread Group -->
    <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="Thread Group" enabled="true">
      <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
      <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" testclass="LoopController" testname="Loop Controller" enabled="true">
        <boolProp name="LoopController.continue_forever">false</boolProp>
        <stringProp name="LoopController.loops">1</stringProp>
      </elementProp>
      <stringProp name="ThreadGroup.num_threads">1</stringProp>
      <stringProp name="ThreadGroup.ramp_time">1</stringProp>
      <longProp name="ThreadGroup.start_time">1666345426000</longProp>
      <longProp name="ThreadGroup.end_time">1666345426000</longProp>
      <boolProp name="ThreadGroup.scheduler">false</boolProp>
      <stringProp name="ThreadGroup.duration"></stringProp>
      <stringProp name="ThreadGroup.delay"></stringProp>
    </ThreadGroup>
    <hashTree>
      <!-- CSV Data Set Config -->
      <CSVDataSet guiclass="TestBeanGUI" testclass="CSVDataSet" testname="CSV Data Set Config Students Info">
        <stringProp name="filename">C:/Users/tareq/Downloads/Load Test/csv-files (1)/1.csv</stringProp>
        <stringProp name="fileEncoding"></stringProp>
        <stringProp name="variableNames"></stringProp>
        <boolProp name="ignoreFirstLine">false</boolProp>
        <stringProp name="delimiter">|</stringProp>
        <boolProp name="quotedData">false</boolProp>
        <boolProp name="recycle">true</boolProp>
        <boolProp name="stopThread">false</boolProp>
        <stringProp name="shareMode">shareMode.all</stringProp>
      </CSVDataSet>
      <hashTree/>
      <!-- HTTP Cookie Manager -->
      <CookieManager guiclass="CookiePanel" testclass="CookieManager" testname="HTTP Cookie Manager" enabled="true">
        <collectionProp name="CookieManager.cookies"/>
        <boolProp name="CookieManager.clearEachIteration">true</boolProp>
      </CookieManager>
      <hashTree/>
      <!-- Group all HTTP requests in a Simple Controller -->
      <GenericController guiclass="LogicControllerGui" testclass="GenericController" testname="HTTP Requests" enabled="true"/>
      <hashTree>
        ${samplerWithHashTrees}
      </hashTree>
    </hashTree>
    <!-- Listeners at root level -->
    <ResultCollector guiclass="SummaryReport" testclass="ResultCollector" testname="Summary Report" enabled="true">
      <boolProp name="ResultCollector.error_logging">false</boolProp>
      <objProp>
        <name>saveConfig</name>
        <value class="SampleSaveConfiguration">
          <time>true</time>
          <latency>true</latency>
          <timestamp>true</timestamp>
          <success>true</success>
          <label>true</label>
          <code>true</code>
          <message>true</message>
          <threadName>true</threadName>
          <dataType>true</dataType>
          <encoding>false</encoding>
          <assertions>true</assertions>
          <subresults>true</subresults>
          <responseData>false</responseData>
          <samplerData>false</samplerData>
          <xml>false</xml>
          <fieldNames>true</fieldNames>
          <responseHeaders>false</responseHeaders>
          <requestHeaders>false</requestHeaders>
          <responseDataOnError>false</responseDataOnError>
          <saveAssertionResultsFailureMessage>true</saveAssertionResultsFailureMessage>
          <assertionsResultsToSave>0</assertionsResultsToSave>
          <bytes>true</bytes>
          <sentBytes>true</sentBytes>
          <url>true</url>
          <threadCounts>true</threadCounts>
          <idleTime>true</idleTime>
          <connectTime>true</connectTime>
        </value>
      </objProp>
      <stringProp name="filename"></stringProp>
    </ResultCollector>
    <hashTree/>
    <ResultCollector guiclass="ViewResultsFullVisualizer" testclass="ResultCollector" testname="View Results Tree" enabled="true">
      <boolProp name="ResultCollector.error_logging">false</boolProp>
      <objProp>
        <name>saveConfig</name>
        <value class="SampleSaveConfiguration">
          <time>true</time>
          <latency>true</latency>
          <timestamp>true</timestamp>
          <success>true</success>
          <label>true</label>
          <code>true</code>
          <message>true</message>
          <threadName>true</threadName>
          <dataType>true</dataType>
          <encoding>false</encoding>
          <assertions>true</assertions>
          <subresults>true</subresults>
          <responseData>false</responseData>
          <samplerData>false</samplerData>
          <xml>false</xml>
          <fieldNames>true</fieldNames>
          <responseHeaders>false</responseHeaders>
          <requestHeaders>false</requestHeaders>
          <responseDataOnError>false</responseDataOnError>
          <saveAssertionResultsFailureMessage>true</saveAssertionResultsFailureMessage>
          <assertionsResultsToSave>0</assertionsResultsToSave>
          <bytes>true</bytes>
          <sentBytes>true</sentBytes>
          <url>true</url>
          <threadCounts>true</threadCounts>
          <idleTime>true</idleTime>
          <connectTime>true</connectTime>
        </value>
      </objProp>
      <stringProp name="filename"></stringProp>
    </ResultCollector>
    <hashTree/>
    <ResultCollector guiclass="TableVisualizer" testclass="ResultCollector" testname="View Results in Table" enabled="true">
      <boolProp name="ResultCollector.error_logging">false</boolProp>
      <objProp>
        <name>saveConfig</name>
        <value class="SampleSaveConfiguration">
          <time>true</time>
          <latency>true</latency>
          <timestamp>true</timestamp>
          <success>true</success>
          <label>true</label>
          <code>true</code>
          <message>true</message>
          <threadName>true</threadName>
          <dataType>true</dataType>
          <encoding>false</encoding>
          <assertions>true</assertions>
          <subresults>true</subresults>
          <responseData>false</responseData>
          <samplerData>false</samplerData>
          <xml>false</xml>
          <fieldNames>true</fieldNames>
          <responseHeaders>false</responseHeaders>
          <requestHeaders>false</requestHeaders>
          <responseDataOnError>false</responseDataOnError>
          <saveAssertionResultsFailureMessage>true</saveAssertionResultsFailureMessage>
          <assertionsResultsToSave>0</assertionsResultsToSave>
          <bytes>true</bytes>
          <sentBytes>true</sentBytes>
          <url>true</url>
          <threadCounts>true</threadCounts>
          <idleTime>true</idleTime>
          <connectTime>true</connectTime>
        </value>
      </objProp>
      <stringProp name="filename"></stringProp>
    </ResultCollector>
    <hashTree/>
  </hashTree>
</hashTree>
</jmeterTestPlan>`;
}

// Optional: Download helper, comment out import if needed
export function downloadFile(filename, content) {
    const blob = new Blob([content], {type: "text/xml"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
