import {  Heading, Container, VStack } from "@chakra-ui/react";
import JobCreation from "./components/JobCreation";
import JobList from "./components/JobList";

const App = () => {
  return (
    <Container maxW="container.md" py={5}>
      <VStack>
        <Heading>Email Queue Simulation</Heading>
        <JobCreation />
        <JobList />
      </VStack>
    </Container>
  );
};

export default App;
